import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { brewingMethods, recipes, shots } from '@/db/schema'
import {
  hasOnlyShotParameterKeys,
  normalizeShotParameterKeys,
} from '@/lib/brewing-methods'
import {
  nameSchema,
  notesSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

class BrewingMethodInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrewingMethodInputError'
  }
}

const brewingMethodWriteSchema = z.object({
  name: nameSchema,
  description: notesSchema.nullable(),
  enabledParameters: z.array(z.string().max(100)).max(50),
  timerEnabled: z.boolean(),
})

const brewingMethodUpdateSchema = brewingMethodWriteSchema.extend({
  id: positiveIdSchema,
})

function normalizeBrewingMethodWrite(
  data: z.infer<typeof brewingMethodWriteSchema>,
) {
  if (!hasOnlyShotParameterKeys(data.enabledParameters)) {
    throw new BrewingMethodInputError('Choose only supported shot parameters')
  }
  if (
    data.timerEnabled &&
    !data.enabledParameters.includes('shotTimeSeconds')
  ) {
    throw new BrewingMethodInputError(
      'Enable the Brew time field before enabling the timer',
    )
  }
  return {
    name: data.name,
    description: data.description?.trim() || null,
    enabledParameters: [...normalizeShotParameterKeys(data.enabledParameters)],
    timerEnabled: data.timerEnabled,
  }
}

export const getBrewingMethods = createServerFn({ method: 'GET' }).handler(
  async () =>
    db.query.brewingMethods.findMany({
      orderBy: [asc(brewingMethods.id)],
    }),
)

export const createBrewingMethod = createServerFn({ method: 'POST' })
  .validator((input: unknown) =>
    normalizeBrewingMethodWrite(brewingMethodWriteSchema.parse(input)),
  )
  .handler(async ({ data }) => {
    const duplicate = await db.query.brewingMethods.findFirst({
      where: sql`lower(${brewingMethods.name}) = lower(${data.name})`,
    })
    if (duplicate) {
      throw new BrewingMethodInputError(
        'A brewing method with this name already exists',
      )
    }
    const [method] = await db.insert(brewingMethods).values(data).returning()
    return method ?? null
  })

export const updateBrewingMethod = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = brewingMethodUpdateSchema.parse(input)
    return { id: data.id, ...normalizeBrewingMethodWrite(data) }
  })
  .handler(async ({ data }) => {
    const duplicate = await db.query.brewingMethods.findFirst({
      where: and(
        ne(brewingMethods.id, data.id),
        sql`lower(${brewingMethods.name}) = lower(${data.name})`,
      ),
    })
    if (duplicate) {
      throw new BrewingMethodInputError(
        'A brewing method with this name already exists',
      )
    }
    const [method] = await db
      .update(brewingMethods)
      .set({
        name: data.name,
        description: data.description,
        enabledParameters: [...data.enabledParameters],
        timerEnabled: data.timerEnabled,
        updatedAt: new Date(),
      })
      .where(eq(brewingMethods.id, data.id))
      .returning()
    if (!method) throw new BrewingMethodInputError('Brewing method not found')
    return method
  })

export const deleteBrewingMethod = createServerFn({ method: 'POST' })
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`LOCK TABLE ${brewingMethods} IN SHARE ROW EXCLUSIVE MODE`,
      )
      const [methodCount] = await tx
        .select({ value: count() })
        .from(brewingMethods)
      if (!methodCount || methodCount.value <= 1) {
        throw new BrewingMethodInputError('Keep at least one brewing method')
      }
      const [shotCount] = await tx
        .select({ value: count() })
        .from(shots)
        .where(eq(shots.brewingMethodId, id))
      const [recipeCount] = await tx
        .select({ value: count() })
        .from(recipes)
        .where(eq(recipes.brewingMethodId, id))
      if ((shotCount?.value ?? 0) > 0 || (recipeCount?.value ?? 0) > 0) {
        throw new BrewingMethodInputError(
          'This brewing method is still used by shots or recipes',
        )
      }
      const [method] = await tx
        .delete(brewingMethods)
        .where(eq(brewingMethods.id, id))
        .returning({ id: brewingMethods.id })
      if (!method) throw new BrewingMethodInputError('Brewing method not found')
    }),
  )
