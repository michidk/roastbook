import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import {
  beanPurchases,
  beans,
  brewingMethods,
  clientOperations,
  recipes,
  shotAccessoryGear,
  shots,
  shotTasteTags,
  tasteTags,
} from '@/db/schema'
import {
  replaceShotAccessoryGear,
  withAccessoryGearIds,
} from '@/journal/domain/accessory-gear'
import { clientOperationMutations } from '@/journal/domain/client-operations'
import {
  assertDrinkSelection,
  assertDrinkTypeAvailableForBrewingMethod,
  replaceShotDrinkOptions,
} from '@/journal/domain/drink-options'
import { findCurrentOwnerMachineSettingRevisionId } from '@/journal/domain/gear-properties'
import { deleteEntityWithMedia } from '@/journal/domain/media-lifecycle'
import { readTasteProfile } from '@/journal/domain/settings'
import type {
  CreateShotAndSaveRecipeInput,
  RelatedShotListInput,
  ShotGroupListInput,
  ShotListInput,
} from '@/journal/domain/shot-list-contract'
import {
  projectAccessoryGearIds,
  projectShotParameters,
} from '@/journal/domain/shot-parameter-projection'
import { prepareRecipeFromShot } from '@/journal/domain/shot-recipes'
import { shotSortExpression } from '@/journal/domain/shot-sort'
import {
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
  runJournalMutations,
} from '@/journal/platform/database'
import { resolvePagination } from '@/lib/collection-query'
import { expectReturnedRow } from '@/lib/domain-errors'
import type {
  shotCreateSchema,
  shotUpdateSchema,
} from '@/lib/server-validation'
import { LEGACY_SENSORY_TASTE_TAG_NAMES } from '@/lib/taste-tags'
import type { ShotSortKey } from '@/modules/brews/read-models'

type ShotCreateCandidate = ReturnType<typeof shotCreateSchema.parse>
const SHOTS_PAGE_SIZE = 12
const SHOT_GROUPS_PAGE_SIZE = 8
const BEAN_SHOT_CHART_LIMIT = 100

class ShotInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShotInputError'
  }
}

type ShotTransaction = Pick<typeof db, 'query' | 'select'>

async function getBrewingMethod(tx: ShotTransaction, brewingMethodId: number) {
  const method = await tx.query.brewingMethods.findFirst({
    where: owned(brewingMethods, eq(brewingMethods.id, brewingMethodId)),
  })
  if (!method) throw new ShotInputError('Brewing method not found')
  return method
}

function getShotValues(
  data: ShotCreateCandidate,
  enabledParameters: readonly string[],
  beanContext: {
    readonly beanId: number | null
    readonly beanPurchaseId: number | null
  },
) {
  return {
    brewingMethodId: data.brewingMethodId,
    brewedAt: data.brewedAt,
    ...beanContext,
    drinkTypeId: data.drinkTypeId ?? null,
    ...projectShotParameters(data, enabledParameters),
    rating: data.rating ?? null,
    extractionBalance: data.extractionBalance ?? null,
    bitterness: data.bitterness ?? null,
    acidity: data.acidity ?? null,
    sweetness: data.sweetness ?? null,
    body: data.body ?? null,
    astringency: data.astringency ?? null,
    notes: data.notes ?? null,
  }
}

async function resolveShotBean(
  tx: ShotTransaction,
  data: Pick<ShotCreateCandidate, 'beanId' | 'beanPurchaseId'>,
) {
  if (!data.beanPurchaseId) {
    return { beanId: data.beanId ?? null, beanPurchaseId: null }
  }
  const purchase = await tx.query.beanPurchases.findFirst({
    where: owned(beanPurchases, eq(beanPurchases.id, data.beanPurchaseId)),
    columns: { id: true, beanId: true },
  })
  if (!purchase) throw new ShotInputError('Selected bag not found')
  if (data.beanId && data.beanId !== purchase.beanId) {
    throw new ShotInputError('Selected bag does not belong to these beans')
  }
  return { beanId: purchase.beanId, beanPurchaseId: purchase.id }
}

const shotRelations = {
  bean: true,
  machineSettingRevision: true,
  machine: true,
  grinder: true,
  basket: true,
  brewingMethod: true,
  drinkType: true,
  drinkOptions: { with: { optionValue: { with: { group: true } } } },
  accessoryGearLinks: { columns: { gearId: true } },
  tasteTags: { with: { tasteTag: true } },
  images: true,
} as const

function shotFilterCondition(methodId?: number, rating?: number) {
  return and(
    methodId ? eq(shots.brewingMethodId, methodId) : undefined,
    rating === undefined
      ? undefined
      : rating === 0
        ? isNull(shots.rating)
        : eq(shots.rating, rating),
  )
}

function shotBeanCondition(beanId: number | undefined) {
  if (beanId === undefined) return undefined
  return beanId === 0 ? isNull(shots.beanId) : eq(shots.beanId, beanId)
}

/**
 * The rating filter and the rating sort only mean something while the overall
 * rating is part of the taste profile. A search parameter left over from before
 * it was switched off must not keep narrowing or reordering the list, since the
 * controls that produced it are no longer rendered.
 */
async function ratingAwareScope(
  rating: number | undefined,
  sort: ShotSortKey,
): Promise<{ rating: number | undefined; sort: ShotSortKey }> {
  const { overallRating } = await readTasteProfile()
  if (overallRating) return { rating, sort }
  return { rating: undefined, sort: sort === 'rating' ? 'date' : sort }
}

async function loadShotPage(data: Omit<ShotListInput, 'beanId'>, scope?: SQL) {
  const scoped = await ratingAwareScope(data.rating, data.sort)
  const filters = shotFilterCondition(data.methodId, scoped.rating)
  const where = scope && filters ? and(scope, filters) : (scope ?? filters)
  const countRows = await db
    .select({ value: count() })
    .from(shots)
    .where(owned(shots, where))
  const totalItems = Number(countRows[0]?.value ?? 0)
  const pagination = resolvePagination(totalItems, data.page, SHOTS_PAGE_SIZE)
  const { page } = pagination
  const sortExpression = shotSortExpression(scoped.sort)
  const order =
    data.direction === 'asc' ? asc(sortExpression) : desc(sortExpression)
  const items = await db.query.shots.findMany({
    where: owned(shots, where),
    orderBy: [order, desc(shots.id)],
    limit: SHOTS_PAGE_SIZE,
    offset: (page - 1) * SHOTS_PAGE_SIZE,
    columns: {
      id: true,
      brewedAt: true,
      doseGrams: true,
      yieldGrams: true,
      brewWaterGrams: true,
      ratioBasis: true,
      grindSetting: true,
      brewTemperatureCelsius: true,
      shotTimeSeconds: true,
      rating: true,
    },
    with: {
      bean: {
        columns: {
          id: true,
          name: true,
          roaster: true,
          origin: true,
          region: true,
          process: true,
        },
        with: { images: true, roasterRef: { columns: { name: true } } },
      },
      brewingMethod: { columns: { id: true, name: true } },
    },
  })

  return { items, ...pagination }
}

export async function getShotPageOperation(data: ShotListInput) {
  const [page, scopeLabel] = await Promise.all([
    loadShotPage(data, shotBeanCondition(data.beanId)),
    data.beanId === undefined
      ? null
      : data.beanId === 0
        ? 'No bean recorded'
        : db.query.beans
            .findFirst({
              where: owned(beans, eq(beans.id, data.beanId)),
              columns: { name: true },
            })
            .then((bean) => bean?.name ?? 'Unknown beans'),
  ])

  return { ...page, scopeLabel }
}

export function getBeanShotPageOperation(data: RelatedShotListInput) {
  return loadShotPage(data, eq(shots.beanId, data.entityId))
}

export function getGearShotPageOperation(data: RelatedShotListInput) {
  return loadShotPage(
    data,
    or(
      eq(shots.machineId, data.entityId),
      eq(shots.grinderId, data.entityId),
      eq(shots.basketId, data.entityId),
      sql`exists (
        select 1 from ${shotAccessoryGear}
        where "brew_accessory_gear"."brew_id" = ${shots.id}
          and "brew_accessory_gear"."gear_id" = ${data.entityId}
      )`,
    ),
  )
}

export async function getBeanShotAnalyticsOperation(beanId: number) {
  const tagUsageCount = sql<number>`count(${shotTasteTags.id})`
  const [totals, chartShots, topTasteTags] = await Promise.all([
    db
      .select({
        totalShots: count(),
        usedWeightGrams: sql<string>`cast(coalesce(sum(cast(${shots.doseGrams} as numeric)), 0) as text)`,
      })
      .from(shots)
      .where(owned(shots, eq(shots.beanId, beanId))),
    db.query.shots.findMany({
      where: owned(shots, eq(shots.beanId, beanId)),
      orderBy: [desc(shots.brewedAt), desc(shots.id)],
      limit: BEAN_SHOT_CHART_LIMIT,
      columns: {
        id: true,
        brewedAt: true,
        doseGrams: true,
        yieldGrams: true,
        grindSetting: true,
        shotTimeSeconds: true,
      },
    }),
    db
      .select({
        id: tasteTags.id,
        name: tasteTags.name,
        usageCount: tagUsageCount,
      })
      .from(shotTasteTags)
      .innerJoin(shots, eq(shotTasteTags.shotId, shots.id))
      .innerJoin(tasteTags, eq(shotTasteTags.tasteTagId, tasteTags.id))
      .where(
        owned(
          shotTasteTags,
          and(
            eq(shots.beanId, beanId),
            notInArray(tasteTags.name, [...LEGACY_SENSORY_TASTE_TAG_NAMES]),
          ),
        ),
      )
      .groupBy(tasteTags.id, tasteTags.name)
      .orderBy(desc(tagUsageCount), asc(tasteTags.name))
      .limit(5),
  ])

  return {
    totalShots: totals[0]?.totalShots ?? 0,
    usedWeightGrams: totals[0]?.usedWeightGrams ?? '0',
    chartShots,
    topTasteTags,
  }
}

export async function getShotGroupsOperation(data: ShotGroupListInput) {
  const { rating } = await ratingAwareScope(data.rating, 'date')
  const where = shotFilterCondition(data.methodId, rating)
  const groupKey = sql<number>`coalesce(${shots.beanId}, 0)`
  const countRows = await db
    .select({ value: sql<number>`count(distinct ${groupKey})` })
    .from(shots)
    .where(owned(shots, where))
  const totalItems = Number(countRows[0]?.value ?? 0)
  const pagination = resolvePagination(
    totalItems,
    data.page,
    SHOT_GROUPS_PAGE_SIZE,
  )
  const { page } = pagination
  const summaries = await db
    .select({
      beanId: shots.beanId,
      beanName: beans.name,
      latestShotAt: sql<Date>`max(${shots.brewedAt})`.mapWith(shots.brewedAt),
      totalShots: sql<number>`count(*)`,
    })
    .from(shots)
    .leftJoin(beans, eq(shots.beanId, beans.id))
    .where(owned(shots, where))
    .groupBy(shots.beanId, beans.name)
    .orderBy(desc(sql`max(${shots.brewedAt})`))
    .limit(SHOT_GROUPS_PAGE_SIZE)
    .offset((page - 1) * SHOT_GROUPS_PAGE_SIZE)

  const groups = await Promise.all(
    summaries.map(async (summary) => ({
      key: summary.beanId ? `bean-${summary.beanId}` : 'no-bean',
      bean: summary.beanId
        ? { id: summary.beanId, name: summary.beanName ?? 'Unknown beans' }
        : null,
      label: summary.beanName ?? 'No bean recorded',
      totalShots: Number(summary.totalShots),
      shots: await db.query.shots.findMany({
        where: owned(
          shots,
          and(
            where,
            summary.beanId
              ? eq(shots.beanId, summary.beanId)
              : isNull(shots.beanId),
          ),
        ),
        orderBy: [desc(shots.brewedAt), desc(shots.id)],
        limit: SHOTS_PAGE_SIZE,
        columns: {
          id: true,
          brewedAt: true,
          doseGrams: true,
          yieldGrams: true,
          shotTimeSeconds: true,
          rating: true,
        },
        with: {
          bean: {
            columns: { id: true, name: true },
            with: { images: true },
          },
          brewingMethod: { columns: { id: true, name: true } },
        },
      }),
    })),
  )

  return {
    groups,
    ...pagination,
  }
}

export async function getShotOperation(id: number) {
  const shot = await db.query.shots.findFirst({
    where: owned(shots, eq(shots.id, id)),
    with: shotRelations,
  })
  return shot ? withAccessoryGearIds(shot) : undefined
}

async function completedShot(operationId?: string) {
  if (!operationId) return undefined
  const operation = await db.query.clientOperations.findFirst({
    where: owned(
      clientOperations,
      eq(clientOperations.operationId, operationId),
    ),
  })
  if (!operation) return undefined
  const shot = operation.brewId
    ? await db.query.shots.findFirst({
        where: owned(shots, eq(shots.id, operation.brewId)),
      })
    : undefined
  if (!shot)
    throw new ShotInputError('This brew was already synced and deleted')
  return shot
}

async function shotTagMutations(
  shotId: number,
  tasteTagIds: readonly number[],
): Promise<JournalMutation[]> {
  const mutations: JournalMutation[] = [
    {
      statement: db
        .delete(shotTasteTags)
        .where(owned(shotTasteTags, eq(shotTasteTags.shotId, shotId)))
        .getSQL(),
    },
  ]
  const selected = [...new Set(tasteTagIds)]
  if (!selected.length) return mutations
  const ids = await allocateJournalIds(shotTasteTags, selected.length)
  const rows = ids.map((id, index) => {
    const tasteTagId = selected[index]
    if (tasteTagId === undefined) throw new Error('Invalid tag identifier')
    return { id, shotId, tasteTagId }
  })
  for (let offset = 0; offset < rows.length; offset += 20)
    mutations.push({
      statement: db
        .insert(shotTasteTags)
        .values(journalInsertValues(rows.slice(offset, offset + 20)))
        .getSQL(),
    })
  return mutations
}

async function prepareShotCreate(data: ShotCreateCandidate) {
  const method = await getBrewingMethod(db, data.brewingMethodId)
  await assertDrinkTypeAvailableForBrewingMethod(
    db,
    data.brewingMethodId,
    data.drinkTypeId,
  )
  await assertDrinkSelection(db, data.drinkTypeId, data.drinkOptionValueIds)
  const values = getShotValues(
    data,
    method.enabledParameters,
    await resolveShotBean(db, data),
  )
  const machineSettingRevisionId =
    await findCurrentOwnerMachineSettingRevisionId(db, values.machineId)
  const [id] = await allocateJournalIds(shots)
  if (id === undefined) throw new Error('Could not allocate brew identifier')
  const mutations: JournalMutation[] = [
    {
      statement: db
        .insert(shots)
        .values(
          journalInsertValues({
            ...values,
            id,
            machineSettingRevisionId,
            clientOperationId: data.clientOperationId ?? null,
          }),
        )
        .getSQL(),
      expectedChanges: 1,
    },
    ...(await replaceShotDrinkOptions(id, data.drinkOptionValueIds ?? [])),
    ...(await replaceShotAccessoryGear(
      id,
      projectAccessoryGearIds(data, method.enabledParameters),
    )),
    ...(await shotTagMutations(id, data.tasteTagIds ?? [])),
    ...clientOperationMutations({
      operationId: data.clientOperationId,
      brewId: id,
    }),
  ]
  return {
    id,
    mutations,
    source: {
      ...values,
      accessoryGearIds: data.accessoryGearIds,
      enabledParameters: method.enabledParameters,
      drinkOptionValueIds: data.drinkOptionValueIds ?? [],
    },
  }
}

async function loadPersistedShot(id: number) {
  return expectReturnedRow(
    await db.query.shots.findFirst({ where: owned(shots, eq(shots.id, id)) }),
    'Brew',
  )
}

export async function createShotOperation(data: ShotCreateCandidate) {
  const completed = await completedShot(data.clientOperationId)
  if (completed) return completed
  const plan = await prepareShotCreate(data)
  try {
    await runJournalMutations(plan.mutations)
  } catch (error) {
    const existing = await completedShot(data.clientOperationId)
    if (existing) return existing
    throw error
  }
  return loadPersistedShot(plan.id)
}

export async function createShotAndSaveRecipeOperation(
  data: CreateShotAndSaveRecipeInput,
) {
  const completed = await completedShot(data.shot.clientOperationId)
  if (completed) return { shot: completed, recipe: null }
  const shot = await prepareShotCreate(data.shot)
  const recipe = await prepareRecipeFromShot(shot.source, data.target)
  try {
    await runJournalMutations([...shot.mutations, ...recipe.mutations])
  } catch (error) {
    const existing = await completedShot(data.shot.clientOperationId)
    if (existing) return { shot: existing, recipe: null }
    throw error
  }
  return {
    shot: await loadPersistedShot(shot.id),
    recipe: expectReturnedRow(
      await db.query.recipes.findFirst({
        where: owned(recipes, eq(recipes.id, recipe.id)),
      }),
      'Recipe',
    ),
  }
}

export async function updateShotOperation(
  data: ReturnType<typeof shotUpdateSchema.parse>,
) {
  const completed = await completedShot(data.clientOperationId)
  if (completed) return completed
  const existing = await db.query.shots.findFirst({
    where: owned(shots, eq(shots.id, data.id)),
  })
  if (!existing) throw new ShotInputError('Brew not found')
  if (
    (data.baseRevision !== undefined &&
      existing.revision !== data.baseRevision) ||
    (data.baseRevision === undefined &&
      data.baseUpdatedAt &&
      existing.updatedAt.toISOString() !== data.baseUpdatedAt)
  )
    throw new ShotInputError(
      'This brew changed on the server. Reload and try again.',
    )
  const method = await getBrewingMethod(db, data.brewingMethodId)
  if (
    existing.brewingMethodId !== data.brewingMethodId ||
    existing.drinkTypeId !== data.drinkTypeId
  )
    await assertDrinkTypeAvailableForBrewingMethod(
      db,
      data.brewingMethodId,
      data.drinkTypeId,
    )
  await assertDrinkSelection(db, data.drinkTypeId, data.drinkOptionValueIds)
  const values = getShotValues(
    data,
    method.enabledParameters,
    await resolveShotBean(db, data),
  )
  const machineSettingRevisionId =
    existing.machineId !== values.machineId
      ? await findCurrentOwnerMachineSettingRevisionId(db, values.machineId)
      : existing.machineSettingRevisionId
  const mutations: JournalMutation[] = [
    {
      statement: db
        .update(shots)
        .set({
          ...values,
          machineSettingRevisionId,
          revision: existing.revision + 1,
          updatedAt: new Date(),
        })
        .where(
          owned(
            shots,
            and(eq(shots.id, data.id), eq(shots.revision, existing.revision)),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage: 'This brew changed on the server. Reload and try again.',
    },
    ...(data.drinkOptionValueIds === undefined
      ? []
      : await replaceShotDrinkOptions(data.id, data.drinkOptionValueIds)),
    ...(await replaceShotAccessoryGear(
      data.id,
      projectAccessoryGearIds(data, method.enabledParameters),
    )),
    ...(data.tasteTagIds === undefined
      ? []
      : await shotTagMutations(data.id, data.tasteTagIds)),
    ...clientOperationMutations({
      operationId: data.clientOperationId,
      brewId: data.id,
    }),
  ]
  try {
    await runJournalMutations(mutations)
  } catch (error) {
    const completed = await completedShot(data.clientOperationId)
    if (completed) return completed
    throw error
  }
  return loadPersistedShot(data.id)
}

export async function deleteShotOperation(data: {
  readonly id: number
  readonly baseRevision?: number
  readonly baseUpdatedAt?: string
  readonly idempotent?: boolean
}) {
  await deleteEntityWithMedia('shots', data.id, {
    expectedRevision: data.baseRevision,
    expectedUpdatedAt: data.baseUpdatedAt
      ? new Date(data.baseUpdatedAt)
      : undefined,
    idempotent: data.idempotent,
  })
}

export async function getLastShotForBeanAndMethodOperation(data: {
  readonly beanId: number
  readonly brewingMethodId: number
}) {
  const shot = await db.query.shots.findFirst({
    where: owned(
      shots,
      and(
        eq(shots.beanId, data.beanId),
        eq(shots.brewingMethodId, data.brewingMethodId),
      ),
    ),
    orderBy: [desc(shots.brewedAt)],
    with: {
      brewingMethod: true,
      accessoryGearLinks: { columns: { gearId: true } },
      drinkOptions: { with: { optionValue: true } },
    },
  })
  return shot ? withAccessoryGearIds(shot) : undefined
}
