import { defineConfig } from 'drizzle-kit'
import { drizzleMigrationsDirName } from './scripts/migration-config'

// Schema-only tools such as Knip and `drizzle-kit generate` do not connect to
// PostgreSQL, but Drizzle still requires a syntactically valid URL while loading
// this config. Commands that actually connect keep their own DATABASE_URL check.
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://roastbook:roastbook@localhost:5432/roastbook'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: `./${drizzleMigrationsDirName}`,
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
