import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import {
  allocateJournalIds,
  type JournalMutation,
  runJournalMutations,
} from '@/db/journal-mutations.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import {
  drinkOptionGroups,
  drinkOptionValues,
  drinkTypeOptionGroups,
  drinkTypes,
} from '@/db/schema'
import { positiveIdSchema } from '@/lib/server-validation'
import {
  drinkTypeWriteSchema,
  optionValueWriteSchema,
} from '@/modules/journal/drink-options-input'

export const getDrinkConfiguration = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [types, groups] = await Promise.all([
      db.query.drinkTypes.findMany({
        where: owned(drinkTypes, eq(drinkTypes.isArchived, false)),
        orderBy: [asc(drinkTypes.name)],
        with: { optionGroupLinks: true },
      }),
      db.query.drinkOptionGroups.findMany({
        where: owned(
          drinkOptionGroups,
          eq(drinkOptionGroups.isArchived, false),
        ),
        orderBy: [asc(drinkOptionGroups.name)],
        with: {
          values: {
            where: eq(drinkOptionValues.isArchived, false),
            orderBy: [asc(drinkOptionValues.name)],
          },
        },
      }),
    ])
    return {
      drinkTypes: types.map(({ optionGroupLinks, ...type }) => ({
        ...type,
        optionGroupIds: optionGroupLinks.map((link) => link.optionGroupId),
      })),
      optionGroups: groups,
    }
  },
)

export const saveDrinkType = createServerFn({ method: 'POST' })
  .validator(drinkTypeWriteSchema)
  .handler(async ({ data }) => {
    const duplicate = await db.query.drinkTypes.findFirst({
      where: owned(
        drinkTypes,
        data.id
          ? and(eq(drinkTypes.name, data.name), ne(drinkTypes.id, data.id))
          : eq(drinkTypes.name, data.name),
      ),
    })
    if (duplicate && (!duplicate.isArchived || data.id !== undefined)) {
      throw new Error(`A drink type named "${data.name}" already exists`)
    }
    const id =
      duplicate?.id ?? data.id ?? (await allocateJournalIds(drinkTypes))[0]
    if (id === undefined)
      throw new Error('Could not allocate a drink type identifier')
    const mutations: JournalMutation[] = [
      {
        statement: duplicate
          ? db
              .update(drinkTypes)
              .set({ isArchived: false, updatedAt: new Date() })
              .where(
                owned(
                  drinkTypes,
                  and(eq(drinkTypes.id, id), eq(drinkTypes.isArchived, true)),
                ),
              )
              .getSQL()
          : data.id
            ? db
                .update(drinkTypes)
                .set({ name: data.name, updatedAt: new Date() })
                .where(owned(drinkTypes, eq(drinkTypes.id, id)))
                .getSQL()
            : db
                .insert(drinkTypes)
                .values(journalInsertValues({ id, name: data.name }))
                .getSQL(),
        expectedChanges: 1,
        conflictMessage: 'Could not save this drink type',
      },
      {
        statement: db
          .delete(drinkTypeOptionGroups)
          .where(
            owned(
              drinkTypeOptionGroups,
              eq(drinkTypeOptionGroups.drinkTypeId, id),
            ),
          )
          .getSQL(),
      },
    ]
    const groupIds = [...new Set(data.optionGroupIds)]
    if (groupIds.length) {
      const ids = await allocateJournalIds(
        drinkTypeOptionGroups,
        groupIds.length,
      )
      const rows = ids.map((linkId, index) => {
        const optionGroupId = groupIds[index]
        if (optionGroupId === undefined)
          throw new Error('Invalid option group allocation')
        return { id: linkId, drinkTypeId: id, optionGroupId }
      })
      for (let offset = 0; offset < rows.length; offset += 20) {
        mutations.push({
          statement: db
            .insert(drinkTypeOptionGroups)
            .values(journalInsertValues(rows.slice(offset, offset + 20)))
            .getSQL(),
        })
      }
    }
    await runJournalMutations(mutations)
    const saved = await db.query.drinkTypes.findFirst({
      where: owned(drinkTypes, eq(drinkTypes.id, id)),
    })
    if (!saved) throw new Error('Could not save this drink type')
    return saved
  })

export const archiveDrinkType = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkTypes)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(owned(drinkTypes, eq(drinkTypes.id, id)))
  })

export const createDrinkOptionValue = createServerFn({ method: 'POST' })
  .validator(optionValueWriteSchema)
  .handler(async ({ data }) => {
    const duplicate = await db.query.drinkOptionValues.findFirst({
      where: owned(
        drinkOptionValues,
        and(
          eq(drinkOptionValues.groupId, data.groupId),
          eq(drinkOptionValues.name, data.name),
        ),
      ),
    })
    if (duplicate && !duplicate.isArchived) {
      throw new Error(`"${data.name}" already exists`)
    }
    const [value] = duplicate
      ? await db
          .update(drinkOptionValues)
          .set({ isArchived: false, updatedAt: new Date() })
          .where(
            owned(drinkOptionValues, eq(drinkOptionValues.id, duplicate.id)),
          )
          .returning()
      : await db
          .insert(drinkOptionValues)
          .values(journalInsertValues(data))
          .returning()
    if (!value) throw new Error('Could not add this option')
    return value
  })

export const archiveDrinkOptionValue = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkOptionValues)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(owned(drinkOptionValues, eq(drinkOptionValues.id, id)))
  })
