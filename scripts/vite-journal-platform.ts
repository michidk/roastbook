import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const platform =
  /^@\/journal\/platform\/(config|database|effects|images|runtime|storage)$/

/**
 * Journal code runs on the server and in the browser. The browser build swaps
 * the platform modules for their `.browser.ts` versions, the D1 schema of the
 * hosted build for PostgreSQL, and the demo edition for the product's synced one.
 */
export function journalPlatform(edition: 'standard' | 'demo'): Plugin {
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
      // The browser journal is PostgreSQL even when the server build is D1.
      if (source === resolve('src/db/d1/schema.ts'))
        return resolve('src/db/schema.ts')
      const module = platform.exec(source)?.[1]
      if (module) return resolve(`src/journal/platform/${module}.browser.ts`)
      if (edition === 'demo' && source === '@/journal/local/edition')
        return resolve('packages/journal-demo/src/edition.ts')
      return null
    },
  }
}
