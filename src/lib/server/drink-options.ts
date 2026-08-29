import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  drinkOptionGroups,
  drinkOptionValues,
  drinkTypeOptionGroups,
  drinkTypes,
} from '@/db/schema'
import { nameSchema, positiveIdSchema } from '@/lib/server-validation'

export const getDrinkConfiguration = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [types, groups] = await Promise.all([
      db.query.drinkTypes.findMany({
        where: eq(drinkTypes.isArchived, false),
        orderBy: [asc(drinkTypes.name)],
        with: { optionGroupLinks: true },
      }),
      db.query.drinkOptionGroups.findMany({
        where: eq(drinkOptionGroups.isArchived, false),
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

const drinkTypeWriteSchema = z.object({
  id: positiveIdSchema.optional(),
  name: nameSchema,
  optionGroupIds: z.array(positiveIdSchema).max(20).default([]),
})

export const saveDrinkType = createServerFn({ method: 'POST' })
  .validator(drinkTypeWriteSchema)
  .handler(async ({ data }) =>
    db.transaction(async (tx) => {
      const duplicate = await tx.query.drinkTypes.findFirst({
        where: data.id
          ? and(eq(drinkTypes.name, data.name), ne(drinkTypes.id, data.id))
          : eq(drinkTypes.name, data.name),
      })
      if (duplicate && (!duplicate.isArchived || data.id !== undefined)) {
        throw new Error(`A drink type named "${data.name}" already exists`)
      }
      const [saved] = duplicate
        ? await tx
            .update(drinkTypes)
            .set({ isArchived: false, updatedAt: new Date() })
            .where(eq(drinkTypes.id, duplicate.id))
            .returning()
        : data.id
          ? await tx
              .update(drinkTypes)
              .set({ name: data.name, updatedAt: new Date() })
              .where(eq(drinkTypes.id, data.id))
              .returning()
          : await tx.insert(drinkTypes).values({ name: data.name }).returning()
      if (!saved) throw new Error('Could not save this drink type')
      await tx
        .delete(drinkTypeOptionGroups)
        .where(eq(drinkTypeOptionGroups.drinkTypeId, saved.id))
      const groupIds = [...new Set(data.optionGroupIds)]
      if (groupIds.length > 0) {
        await tx.insert(drinkTypeOptionGroups).values(
          groupIds.map((optionGroupId) => ({
            drinkTypeId: saved.id,
            optionGroupId,
          })),
        )
      }
      return saved
    }),
  )

export const archiveDrinkType = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkTypes)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(drinkTypes.id, id))
  })

const optionValueWriteSchema = z.object({
  groupId: positiveIdSchema,
  name: nameSchema,
})

export const createDrinkOptionValue = createServerFn({ method: 'POST' })
  .validator(optionValueWriteSchema)
  .handler(async ({ data }) => {
    const duplicate = await db.query.drinkOptionValues.findFirst({
      where: and(
        eq(drinkOptionValues.groupId, data.groupId),
        eq(drinkOptionValues.name, data.name),
      ),
    })
    if (duplicate && !duplicate.isArchived) {
      throw new Error(`"${data.name}" already exists`)
    }
    const [value] = duplicate
      ? await db
          .update(drinkOptionValues)
          .set({ isArchived: false, updatedAt: new Date() })
          .where(eq(drinkOptionValues.id, duplicate.id))
          .returning()
      : await db.insert(drinkOptionValues).values(data).returning()
    if (!value) throw new Error('Could not add this option')
    return value
  })

export const archiveDrinkOptionValue = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => {
    await db
      .update(drinkOptionValues)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(drinkOptionValues.id, id))
  })
