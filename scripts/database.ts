import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../src/db/schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required")
  process.exit(1)
}

export const client = postgres(connectionString)
export const db = drizzle(client, { schema })
