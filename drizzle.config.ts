import { defineConfig } from "drizzle-kit"
import { drizzleMigrationsDirName } from "./scripts/migration-config"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required")
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: `./${drizzleMigrationsDirName}`,
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
})
