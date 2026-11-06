import { createReadStream, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

const platform =
  /^@\/journal\/platform\/(clock|config|database|effects|images|runtime|storage)$/

/**
 * Journal code runs on the server and in the browser. The browser build swaps
 * the platform modules for their `.browser.ts` versions, a server schema swapped
 * in by a build extension for PostgreSQL's, and the demo edition for the
 * product's synced one.
 */
export function journalPlatform(
  edition: 'standard' | 'demo',
  serverSchema?: string,
): Plugin {
  return {
    name: 'roastbook-journal-platform',
    enforce: 'pre',
    resolveId(source, importer) {
      if (this.environment.name !== 'client') return null
      // The page talks to the worker; only the worker loads the engine.
      if (
        source === '@electric-sql/pglite' &&
        importer?.includes('/drizzle-orm/')
      )
        return resolve('src/journal/local/pglite-types.ts')
      // The browser journal is PostgreSQL whatever schema the server uses.
      if (serverSchema && source === serverSchema)
        return resolve('src/db/schema.ts')
      const module = platform.exec(source)?.[1]
      if (module) return resolve(`src/journal/platform/${module}.browser.ts`)
      if (edition === 'demo' && source === '@/journal/local/edition')
        return resolve('packages/journal-demo/src/edition.ts')
      return null
    },
    configureServer(server) {
      // The dev server passes only known asset types to Vite; the engine's
      // file system bundle would get the app's 404 page and the journal
      // would never open. Builds emit it as an asset.
      const modules = resolve(server.config.root, 'node_modules') + sep
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split('?')[0] ?? ''
        if (!path.endsWith('/pglite.data')) return next()
        const file = resolve(server.config.root, `.${decodeURIComponent(path)}`)
        if (
          !file.startsWith(modules) ||
          !statSync(file, { throwIfNoEntry: false })?.isFile()
        )
          return next()
        response.setHeader('Content-Type', 'application/octet-stream')
        createReadStream(file).pipe(response)
      })
    },
  }
}
