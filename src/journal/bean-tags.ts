import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { beanTags } from '@/db/schema'
import { journalRead, journalWrite } from '@/journal/function'
import { journalNow } from '@/journal/platform/clock'
import {
  allocateJournalIds,
  db,
  journalInsertValues,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import { positiveIdSchema } from '@/lib/server-validation'

const tagSchema = z.object({ name: z.string().trim().min(1).max(50) })
export const getBeanTags = journalRead('bean-tags/getBeanTags').handler(() =>
  db.query.beanTags.findMany({
    where: owned(beanTags),
    orderBy: [asc(beanTags.name)],
  }),
)
export const createBeanTag = journalWrite('bean-tags/createBeanTag')
  .validator(tagSchema)
  .handler(async ({ data }) => {
    const [id] = await allocateJournalIds(beanTags)
    if (id === undefined) throw new Error('Could not allocate a tag identifier')
    const [tag] = await db
      .insert(beanTags)
      .values(journalInsertValues({ id, name: data.name }))
      .returning()
    return tag
  })
export const updateBeanTag = journalWrite('bean-tags/updateBeanTag')
  .validator(tagSchema.extend({ id: positiveIdSchema }))
  .handler(async ({ data }) => {
    await runJournalMutations([
      {
        statement: db
          .update(beanTags)
          .set({ name: data.name, updatedAt: journalNow() })
          .where(owned(beanTags, eq(beanTags.id, data.id)))
          .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Tag not found',
      },
    ])
  })
export const deleteBeanTag = journalWrite('bean-tags/deleteBeanTag')
  .validator(positiveIdSchema)
  .handler(async ({ data }) => {
    await db.delete(beanTags).where(owned(beanTags, eq(beanTags.id, data)))
  })
