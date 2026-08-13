import { createServerFn } from "@tanstack/react-start"
import { desc, eq, max } from "drizzle-orm"
import { db } from "@/db"
import { beans, shots } from "@/db/schema"

type Suggestion = {
  readonly id: number
  readonly name: string
}

const lastUsedAt = max(shots.createdAt).as("last_used_at")

function mergeSuggestions(
  recentlyUsed: readonly Suggestion[],
  newest: readonly Suggestion[]
) {
  const seen = new Set(recentlyUsed.map((suggestion) => suggestion.id))
  return [
    ...recentlyUsed,
    ...newest.filter((suggestion) => !seen.has(suggestion.id)),
  ]
}

async function loadSuggestions(
  recentlyUsedQuery: PromiseLike<readonly Suggestion[]>,
  newestQuery: PromiseLike<readonly Suggestion[]>,
) {
  const [recentlyUsed, newest] = await Promise.all([
    recentlyUsedQuery,
    newestQuery,
  ])
  return mergeSuggestions(recentlyUsed, newest)
}

export const getBeanSuggestions = createServerFn({ method: "GET" }).handler(
  () =>
    loadSuggestions(
      db
        .select({ id: beans.id, name: beans.name, lastUsedAt })
        .from(shots)
        .innerJoin(beans, eq(shots.beanId, beans.id))
        .where(eq(beans.isArchived, false))
        .groupBy(beans.id, beans.name)
        .orderBy(desc(lastUsedAt))
        .limit(5),
      db
        .select({ id: beans.id, name: beans.name })
        .from(beans)
        .where(eq(beans.isArchived, false))
        .orderBy(desc(beans.createdAt))
        .limit(2),
    ),
)
