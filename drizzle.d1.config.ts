import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/d1/schema.ts',
  out: './drizzle-d1',
  dialect: 'sqlite',
})
