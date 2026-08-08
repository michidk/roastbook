import { drizzle } from "drizzle-orm/postgres-js"
import { inArray } from "drizzle-orm"
import postgres from "postgres"
import * as schema from "../src/db/schema"
import { normalizeForComparison } from "../src/lib/utils"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required")
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client, { schema })

const MERGE_FLAG = "--merge"
const shouldMerge = process.argv.includes(MERGE_FLAG)

interface RoasterWithBeanCount {
  id: number
  name: string
  beanCount: number
}

async function loadRoastersWithBeanCounts(): Promise<RoasterWithBeanCount[]> {
  const roasters = await db.query.roasters.findMany({
    with: { beans: true },
  })

  return roasters
    .map((roaster) => ({
      id: roaster.id,
      name: roaster.name,
      beanCount: roaster.beans.length,
    }))
    .sort((a, b) => a.id - b.id)
}

function groupByNormalizedName(
  roasters: RoasterWithBeanCount[]
): Map<string, RoasterWithBeanCount[]> {
  const groups = new Map<string, RoasterWithBeanCount[]>()

  for (const roaster of roasters) {
    const key = normalizeForComparison(roaster.name)
    const group = groups.get(key)
    if (group) {
      group.push(roaster)
    } else {
      groups.set(key, [roaster])
    }
  }

  return groups
}

// Canonical = most beans referencing it; ties broken by lowest id (oldest row).
function pickCanonical(group: RoasterWithBeanCount[]): RoasterWithBeanCount {
  return [...group].sort((a, b) => {
    if (b.beanCount !== a.beanCount) return b.beanCount - a.beanCount
    return a.id - b.id
  })[0]
}

function printReport(duplicateGroups: RoasterWithBeanCount[][]) {
  console.log(`\nFound ${duplicateGroups.length} duplicate roaster group(s):\n`)

  for (const group of duplicateGroups) {
    const canonical = pickCanonical(group)
    console.log(`Group: "${normalizeForComparison(group[0].name)}"`)
    for (const roaster of group) {
      const marker = roaster.id === canonical.id ? "  <- canonical (kept)" : ""
      console.log(
        `  id=${roaster.id}  name="${roaster.name}"  beans=${roaster.beanCount}${marker}`
      )
    }
    console.log("")
  }
}

async function mergeGroups(duplicateGroups: RoasterWithBeanCount[][]) {
  for (const group of duplicateGroups) {
    const canonical = pickCanonical(group)
    const duplicateIds = group.filter((r) => r.id !== canonical.id).map((r) => r.id)

    if (duplicateIds.length === 0) continue

    await db.transaction(async (tx) => {
      const reassigned = await tx
        .update(schema.beans)
        .set({ roasterId: canonical.id })
        .where(inArray(schema.beans.roasterId, duplicateIds))
        .returning({ id: schema.beans.id })

      await tx.delete(schema.roasters).where(inArray(schema.roasters.id, duplicateIds))

      console.log(`Merged "${normalizeForComparison(canonical.name)}":`)
      console.log(`  Kept id=${canonical.id} name="${canonical.name}"`)
      console.log(
        `  Reassigned ${reassigned.length} bean(s) from roaster id(s) [${duplicateIds.join(", ")}] -> ${canonical.id}`
      )
      console.log(`  Deleted roaster id(s): [${duplicateIds.join(", ")}]`)
    })
  }
}

async function main() {
  const roasters = await loadRoastersWithBeanCounts()
  const groups = groupByNormalizedName(roasters)
  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1)

  console.log(`Scanned ${roasters.length} roaster(s).`)

  if (duplicateGroups.length === 0) {
    console.log("No duplicate roasters found (grouped by lowercase/trimmed/whitespace-collapsed name).")
    await client.end()
    return
  }

  printReport(duplicateGroups)

  if (shouldMerge) {
    console.log(`Merging ${duplicateGroups.length} group(s)...\n`)
    await mergeGroups(duplicateGroups)
    console.log("\nMerge complete.")
  } else {
    console.log(`Dry run only - no changes made. Re-run with ${MERGE_FLAG} to merge these groups.`)
  }

  await client.end()
}

main().catch((err) => {
  console.error("find-duplicate-roasters failed:", err)
  process.exit(1)
})
