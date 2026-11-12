import { and, asc, eq, ne } from 'drizzle-orm'
import {
  drinkOptionGroups,
  drinkOptionValues,
  drinkTypeOptionGroups,
  drinkTypes,
} from '@/db/schema'
import { journalRead, journalWrite } from '@/journal/function'
import {
  drinkTypeWriteSchema,
  optionValueWriteSchema,
} from '@/journal/input/drink-options'
import { journalNow } from '@/journal/platform/clock'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import {
  BUILT_IN_DRINK_TYPE_NAMES,
  BUILT_IN_MILK_NAMES,
} from '@/lib/drink-options'
import { positiveIdSchema } from '@/lib/server-validation'

export const getDrinkConfiguration = journalRead(
  'drink-options/getDrinkConfiguration',
).handler(async () => {
  const [types, groups] = await Promise.all([
    db.query.drinkTypes.findMany({
      where: owned(drinkTypes, eq(drinkTypes.isArchived, false)),
      orderBy: [asc(drinkTypes.name)],
      with: { optionGroupLinks: true },
    }),
    db.query.drinkOptionGroups.findMany({
      where: owned(drinkOptionGroups, eq(drinkOptionGroups.isArchived, false)),
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
})

const isBuiltInType = (name: string) =>
  (BUILT_IN_DRINK_TYPE_NAMES as readonly string[]).includes(name)
const isBuiltInMilk = (name: string) =>
  (BUILT_IN_MILK_NAMES as readonly string[]).includes(name)

// Settings view: active items plus disabled built-ins (archived custom items count as deleted).
export const getDrinkSettings = journalRead(
  'drink-options/getDrinkSettings',
).handler(async () => {
  const [types, groups] = await Promise.all([
    db.query.drinkTypes.findMany({
      where: owned(drinkTypes),
      orderBy: [asc(drinkTypes.name)],
      with: { optionGroupLinks: true },
    }),
    db.query.drinkOptionGroups.findMany({
      where: owned(drinkOptionGroups, eq(drinkOptionGroups.isArchived, false)),
      orderBy: [asc(drinkOptionGroups.name)],
      with: { values: { orderBy: [asc(drinkOptionValues.name)] } },
    }),
  ])
  return {
    drinkTypes: types
      .map(({ optionGroupLinks, ...type }) => ({
        ...type,
        isBuiltIn: isBuiltInType(type.name),
        optionGroupIds: optionGroupLinks.map((link) => link.optionGroupId),
      }))
      .filter((type) => !type.isArchived || type.isBuiltIn),
    optionGroups: groups.map((group) => ({
      ...group,
      values: group.values
        .map((value) => ({ ...value, isBuiltIn: isBuiltInMilk(value.name) }))
        .filter((value) => !value.isArchived || value.isBuiltIn),
    })),
  }
})

export const restoreDrinkType = journalWrite('drink-options/restoreDrinkType')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkTypes)
      .set({ isArchived: false, updatedAt: journalNow() })
      .where(owned(drinkTypes, eq(drinkTypes.id, id)))
  })

export const restoreDrinkOptionValue = journalWrite(
  'drink-options/restoreDrinkOptionValue',
)
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkOptionValues)
      .set({ isArchived: false, updatedAt: journalNow() })
      .where(owned(drinkOptionValues, eq(drinkOptionValues.id, id)))
  })

export const saveDrinkType = journalWrite('drink-options/saveDrinkType')
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
              .set({ isArchived: false, updatedAt: journalNow() })
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
                .set({ name: data.name, updatedAt: journalNow() })
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

export const archiveDrinkType = journalWrite('drink-options/archiveDrinkType')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkTypes)
      .set({ isArchived: true, updatedAt: journalNow() })
      .where(owned(drinkTypes, eq(drinkTypes.id, id)))
  })

export const createDrinkOptionValue = journalWrite(
  'drink-options/createDrinkOptionValue',
)
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
          .set({ isArchived: false, updatedAt: journalNow() })
          .where(
            owned(drinkOptionValues, eq(drinkOptionValues.id, duplicate.id)),
          )
          .returning()
      : await db
          .insert(drinkOptionValues)
          .values(
            journalInsertValues({
              ...data,
              id: (await allocateJournalIds(drinkOptionValues))[0],
            }),
          )
          .returning()
    if (!value) throw new Error('Could not add this option')
    return value
  })

export const archiveDrinkOptionValue = journalWrite(
  'drink-options/archiveDrinkOptionValue',
)
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkOptionValues)
      .set({ isArchived: true, updatedAt: journalNow() })
      .where(owned(drinkOptionValues, eq(drinkOptionValues.id, id)))
  })
