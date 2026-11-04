import { asc, eq } from 'drizzle-orm'
import { tasteTags } from '@/db/schema'
import { journalRead, journalWrite } from '@/journal/function'
import {
  allocateJournalIds,
  db,
  journalInsertValues,
  owned,
} from '@/journal/platform/database'
import { positiveIdSchema, tasteTagCreateSchema } from '@/lib/server-validation'

export const getTasteTags = journalRead('taste-tags/getTasteTags').handler(
  async () => {
    return db.query.tasteTags.findMany({
      where: owned(tasteTags),
      orderBy: [asc(tasteTags.name)],
    })
  },
)

export const createTasteTag = journalWrite('taste-tags/createTasteTag')
  .validator((input: unknown) => tasteTagCreateSchema.parse(input))
  .handler(async ({ data }) => {
    const existing = await db.query.tasteTags.findFirst({
      where: owned(tasteTags, eq(tasteTags.name, data.name)),
    })
    if (existing) throw new Error(`A tag named "${data.name}" already exists`)
    const [id] = await allocateJournalIds(tasteTags)
    const [tag] = await db
      .insert(tasteTags)
      .values(journalInsertValues({ id, name: data.name, category: 'flavor' }))
      .returning()
    return tag
  })

export const deleteTasteTag = journalWrite('taste-tags/deleteTasteTag')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db.delete(tasteTags).where(owned(tasteTags, eq(tasteTags.id, id)))
  })
