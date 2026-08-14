import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { drizzleMigrationsDirName } from './migration-config'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = resolve(
  currentDirectory,
  `../${drizzleMigrationsDirName}`,
)

const client = postgres(connectionString, {
  max: 1,
})

const db = drizzle(client)

/** Type guard for postgres errors with error codes */
function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  )
}

async function waitForDatabase() {
  const attempts = 30
  const delayMs = 2000
  const nonRetryableCodes = new Set([
    '28P01', // invalid_password
    '28000', // invalid_authorization_specification
    '3D000', // database_does_not_exist
  ])

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await client`select 1`
      return
    } catch (error) {
      if (attempt === attempts) {
        throw error
      }

      if (hasErrorCode(error) && nonRetryableCodes.has(error.code)) {
        throw error
      }

      console.log(
        `Waiting for database to become ready (${attempt}/${attempts})`,
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

async function closeClient() {
  const timeoutMs = 5000

  await Promise.race([
    client.end(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Timed out closing database client after ${timeoutMs}ms`),
        )
      }, timeoutMs)
    }),
  ])
}

let migrationError: unknown
let closeError: unknown

try {
  await waitForDatabase()
  console.log(`Running database migrations from ${migrationsFolder}`)
  await migrate(db, { migrationsFolder })
  console.log('Database migrations complete')
} catch (error) {
  migrationError = error
} finally {
  try {
    await closeClient()
  } catch (error) {
    closeError = error
  }
}

if (migrationError) {
  if (closeError)
    console.error('Failed to close database client cleanly:', closeError)
  throw migrationError
}

if (closeError) throw closeError
