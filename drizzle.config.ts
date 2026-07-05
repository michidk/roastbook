import { defineConfig } from "drizzle-kit"
import { drizzleMigrationsDirName } from "./scripts/migration-config"

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: `./${drizzleMigrationsDirName}`,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
