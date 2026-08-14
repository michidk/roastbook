import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const MIGRATION_DEBOUNCE_MS = 400

export function isMigrationManifestPath(filePath: string): boolean {
  const normalizedPath = filePath.replaceAll('\\', '/')
  return (
    /(^|\/)drizzle\/[^/]+\.sql$/.test(normalizedPath) ||
    /(^|\/)drizzle\/meta\/_journal\.json$/.test(normalizedPath)
  )
}

function runMigrations(root: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const migration = spawn('bun', ['run', 'db:migrate'], {
      cwd: root,
      stdio: 'inherit',
    })

    migration.once('error', reject)
    migration.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(
        new Error(
          signal
            ? `Database migration stopped by ${signal}`
            : `Database migration exited with code ${code ?? 'unknown'}`,
        ),
      )
    })
  })
}

function watchMigrations(server: ViteDevServer) {
  const root = server.config.root
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let migrationRunning = false
  let rerunRequested = false
  let closed = false

  const scheduleMigration = () => {
    if (closed) return
    if (migrationRunning) {
      rerunRequested = true
      return
    }
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void migrate(), MIGRATION_DEBOUNCE_MS)
  }

  const migrate = async () => {
    migrationRunning = true
    server.config.logger.info('\nNew database migration detected; applying it…')
    try {
      await runMigrations(root)
      server.config.logger.info('Database migrations applied; reloading…')
      if (!closed) server.ws.send({ type: 'full-reload' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      server.config.logger.error(`Database migration failed: ${message}`)
    } finally {
      migrationRunning = false
      if (rerunRequested) {
        rerunRequested = false
        scheduleMigration()
      }
    }
  }

  const handleFileChange = (filePath: string) => {
    if (isMigrationManifestPath(filePath)) scheduleMigration()
  }

  server.watcher.add(resolve(root, 'drizzle'))
  server.watcher.on('add', handleFileChange)
  server.watcher.on('change', handleFileChange)
  server.httpServer?.once('close', () => {
    closed = true
    if (debounceTimer) clearTimeout(debounceTimer)
  })
}

async function configureDevMigrations(server: ViteDevServer) {
  server.config.logger.info('Checking for pending database migrations…')
  try {
    await runMigrations(server.config.root)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    server.config.logger.error(`Database migration failed: ${message}`)
    throw error
  }
  watchMigrations(server)
}

export function devMigrations(): Plugin {
  return {
    name: 'roastbook-dev-migrations',
    apply: 'serve',
    configureServer: configureDevMigrations,
  }
}
