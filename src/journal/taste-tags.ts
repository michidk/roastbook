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
import { scaFlavorCategory } from '@/lib/taste-tags'

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
    if (existing?.isArchived) {
      const [restored] = await db
        .update(tasteTags)
        .set({ isArchived: false })
        .where(owned(tasteTags, eq(tasteTags.id, existing.id)))
        .returning()
      return restored
    }
    if (existing) throw new Error(`A tag named "${data.name}" already exists`)
    const [id] = await allocateJournalIds(tasteTags)
    const [tag] = await db
      .insert(tasteTags)
      .values(journalInsertValues({ id, name: data.name, category: 'flavor' }))
      .returning()
    return tag
  })

/** Only custom tags can be deleted; built-in tags are disabled instead. */
export const deleteTasteTag = journalWrite('taste-tags/deleteTasteTag')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    const tag = await db.query.tasteTags.findFirst({
      where: owned(tasteTags, eq(tasteTags.id, id)),
    })
    if (tag && scaFlavorCategory(tag.name)) {
      throw new Error('Built-in taste tags can be disabled, not deleted')
    }
    await db.delete(tasteTags).where(owned(tasteTags, eq(tasteTags.id, id)))
  })

export const disableTasteTag = journalWrite('taste-tags/disableTasteTag')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(tasteTags)
      .set({ isArchived: true })
      .where(owned(tasteTags, eq(tasteTags.id, id)))
  })

export const enableTasteTag = journalWrite('taste-tags/enableTasteTag')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(tasteTags)
      .set({ isArchived: false })
      .where(owned(tasteTags, eq(tasteTags.id, id)))
  })
