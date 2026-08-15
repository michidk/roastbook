import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { tasteTags } from '@/db/schema'
import { positiveIdSchema, tasteTagCreateSchema } from '@/lib/server-validation'

export const getTasteTags = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.query.tasteTags.findMany({ orderBy: [asc(tasteTags.name)] })
  },
)

export const createTasteTag = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tasteTagCreateSchema.parse(input))
  .handler(async ({ data }) => {
    const existing = await db.query.tasteTags.findFirst({
      where: eq(tasteTags.name, data.name),
    })
    if (existing) throw new Error(`A tag named "${data.name}" already exists`)
    const [tag] = await db
      .insert(tasteTags)
      .values({
        name: data.name,
        llmInstruction: data.llmInstruction,
      })
      .returning()
    return tag
  })

export const deleteTasteTag = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db.delete(tasteTags).where(eq(tasteTags.id, id))
  })
