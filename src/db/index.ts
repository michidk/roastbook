import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

let db: PostgresJsDatabase<typeof schema>

if (import.meta.env.SSR) {
  const [{ drizzle }, { default: postgres }] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres"),
  ])
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required")
  }

  db = drizzle(postgres(connectionString), { schema })
} else {
  // Server-function implementations are replaced with RPC stubs in the client.
  // Keep this module browser-safe when route modules import those functions.
  db = undefined as unknown as PostgresJsDatabase<typeof schema>
}

export { db }
