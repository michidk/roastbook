import { readdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { drizzleMigrationsDirName } from "./migration-config"

const journalSchema = z.object({
  entries: z.array(
    z.object({
      tag: z.string(),
      when: z.number(),
    }),
  ),
})

const scriptsDirectory = dirname(fileURLToPath(import.meta.url))
const migrationsDirectory = resolve(
  scriptsDirectory,
  `../${drizzleMigrationsDirName}`,
)

describe("migration history", () => {
  it("keeps journal timestamps in execution order", async () => {
    const journalText = await readFile(
      resolve(migrationsDirectory, "meta/_journal.json"),
      "utf8",
    )
    const journal = journalSchema.parse(JSON.parse(journalText))

    for (const [index, entry] of journal.entries.entries()) {
      const previousEntry = journal.entries[index - 1]
      if (!previousEntry) continue

      expect(entry.when, entry.tag).toBeGreaterThan(previousEntry.when)
    }
  })

  it("creates each table only once across the migration chain", async () => {
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort()
    const createdTables = new Map<string, string>()

    for (const fileName of migrationFiles) {
      const sql = await readFile(resolve(migrationsDirectory, fileName), "utf8")
      const tableMatches = sql.matchAll(
        /CREATE TABLE(?: IF NOT EXISTS)?\s+"([^"]+)"/g,
      )

      for (const match of tableMatches) {
        const tableName = match[1]
        if (!tableName) continue

        expect(createdTables.get(tableName), tableName).toBeUndefined()
        createdTables.set(tableName, fileName)
      }
    }
  })
})
