import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { recipes } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export const getRecipes = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.recipes.findMany({
    where: eq(recipes.isArchived, false),
    orderBy: [desc(recipes.updatedAt)],
    with: {
      gear: {
        with: {
          gear: true,
        },
      },
    },
  })
})

