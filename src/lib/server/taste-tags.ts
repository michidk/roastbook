import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"

export const getTasteTags = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.query.tasteTags.findMany()
  }
)

