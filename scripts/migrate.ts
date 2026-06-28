import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required")
  process.exit(1)
}

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = resolve(currentDirectory, "../drizzle")

const client = postgres(connectionString, {
  max: 1,
})

const db = drizzle(client)

try {
  console.log(`Running database migrations from ${migrationsFolder}`)
  await migrate(db, { migrationsFolder })
  console.log("Database migrations complete")
} finally {
  await client.end()
}
