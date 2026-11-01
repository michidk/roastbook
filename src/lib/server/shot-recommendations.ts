import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import {
  beanPurchases,
  brewingMethods,
  espressoMachineSettingRevisions,
  gear,
  shots,
} from '@/db/schema'
import {
  answerShotRecommendationQuestion,
  isResearchEnabled,
  recommendShotFromHistory,
} from '@/lib/server/ai-operations.server'
import { withResourceLimits } from '@/lib/server/resource-limits.server'
import {
  recommendationBeanEvidence,
  recommendationGearEvidence,
  recommendationHistoryIds,
  recommendationShotEvidence,
} from '@/lib/server/shot-recommendation-evidence.server'
import {
  haveSameAccessoryGear,
  isFocusedShotRecommendationRequest,
  type ShotRecommendationContext,
  type ShotRecommendationRequest,
  shotRecommendationRequestSchema,
} from '@/lib/shot-recommendation'
import { shotRecommendationChatRequestSchema } from '@/lib/shot-recommendation-chat'

const RECOMMENDATION_HISTORY_LIMIT = 50

type RecommendationSetup = {
  readonly beanId: number
  readonly beanPurchaseId: number | null
  readonly brewingMethodId: number
  readonly machineId: number | null
  readonly grinderId: number | null
  readonly basketId: number | null
  readonly accessoryGearIds: readonly number[]
  readonly focusedShotId: number | null
}

const recommendationShotRelations = {
  machineSettingRevision: true,
  tasteTags: { with: { tasteTag: true } },
  accessoryGearLinks: { columns: { gearId: true } },
} as const

const recommendationGearRelations = {
  espressoMachineDetails: true as const,
  machineSettingRevisions: {
    orderBy: [desc(espressoMachineSettingRevisions.effectiveFrom)],
  },
  grinderDetails: true as const,
  brewerDetails: true as const,
  kettleDetails: true as const,
  scaleDetails: true as const,
  tamperDetails: true as const,
  wdtDetails: true as const,
  basketDetails: true as const,
}

class ShotRecommendationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShotRecommendationError'
  }
}

function normalizedAccessoryIds(ids: readonly number[]) {
  return [...new Set(ids)].sort((left, right) => left - right)
}

async function resolveSetup(
  request: ReturnType<typeof shotRecommendationRequestSchema.parse>,
): Promise<RecommendationSetup> {
  if (isFocusedShotRecommendationRequest(request)) {
    const focusedShot = await db.query.shots.findFirst({
      where: eq(shots.id, request.shotId),
      columns: {
        id: true,
        beanId: true,
        beanPurchaseId: true,
        brewingMethodId: true,
        machineId: true,
        grinderId: true,
        basketId: true,
      },
      with: { accessoryGearLinks: { columns: { gearId: true } } },
    })
    if (!focusedShot) {
      throw new ShotRecommendationError('Brew not found.')
    }
    if (!focusedShot.beanId) {
      throw new ShotRecommendationError(
        'Add beans to this brew before requesting an AI opinion.',
      )
    }

    return {
      beanId: focusedShot.beanId,
      beanPurchaseId: focusedShot.beanPurchaseId,
      brewingMethodId: focusedShot.brewingMethodId,
      machineId: focusedShot.machineId,
      grinderId: focusedShot.grinderId,
      basketId: focusedShot.basketId,
      accessoryGearIds: normalizedAccessoryIds(
        focusedShot.accessoryGearLinks.map((link) => link.gearId),
      ),
      focusedShotId: focusedShot.id,
    }
  }

  if (request.historyShotId) {
    const setup = await resolveSetup({ shotId: request.historyShotId })
    if (setup.beanId !== request.beanId) {
      throw new ShotRecommendationError(
        'The selected setup belongs to different beans.',
      )
    }
    return {
      ...setup,
      beanPurchaseId: request.beanPurchaseId ?? setup.beanPurchaseId,
      focusedShotId: null,
    }
  }

  if (request.currentDraft && request.brewingMethodId) {
    return {
      beanId: request.beanId,
      beanPurchaseId: request.beanPurchaseId ?? null,
      brewingMethodId: request.brewingMethodId,
      machineId: request.currentDraft.machineId,
      grinderId: request.currentDraft.grinderId,
      basketId: request.currentDraft.basketId,
      accessoryGearIds: normalizedAccessoryIds(
        request.currentDraft.accessoryGearIds,
      ),
      focusedShotId: null,
    }
  }

  const latestShot = await db.query.shots.findFirst({
    where: request.brewingMethodId
      ? and(
          eq(shots.beanId, request.beanId),
          eq(shots.brewingMethodId, request.brewingMethodId),
        )
      : eq(shots.beanId, request.beanId),
    orderBy: [desc(shots.brewedAt), desc(shots.id)],
    columns: {
      beanId: true,
      beanPurchaseId: true,
      brewingMethodId: true,
      machineId: true,
      grinderId: true,
      basketId: true,
    },
    with: { accessoryGearLinks: { columns: { gearId: true } } },
  })
  if (!latestShot?.beanId) {
    throw new ShotRecommendationError(
      request.brewingMethodId
        ? 'Log a brew for these beans and brewing method before requesting a recommendation.'
        : 'Log a brew for these beans before requesting a recommendation.',
    )
  }

  return {
    beanId: request.beanId,
    beanPurchaseId: request.beanPurchaseId ?? latestShot.beanPurchaseId,
    brewingMethodId: latestShot.brewingMethodId,
    machineId: latestShot.machineId,
    grinderId: latestShot.grinderId,
    basketId: latestShot.basketId,
    accessoryGearIds: normalizedAccessoryIds(
      latestShot.accessoryGearLinks.map((link) => link.gearId),
    ),
    focusedShotId: null,
  }
}

function setupConditions(setup: RecommendationSetup) {
  return and(
    eq(shots.beanId, setup.beanId),
    eq(shots.brewingMethodId, setup.brewingMethodId),
    setup.machineId === null
      ? isNull(shots.machineId)
      : eq(shots.machineId, setup.machineId),
    setup.grinderId === null
      ? isNull(shots.grinderId)
      : eq(shots.grinderId, setup.grinderId),
    setup.basketId === null
      ? isNull(shots.basketId)
      : eq(shots.basketId, setup.basketId),
  )
}

export const checkShotRecommendationEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: isResearchEnabled() }))

export const getShotRecommendationOptions = createServerFn({ method: 'GET' })
  .validator(shotRecommendationRequestSchema)
  .handler(async ({ data }) => {
    if (isFocusedShotRecommendationRequest(data) || data.currentDraft) return []
    const history = await db.query.shots.findMany({
      where: data.brewingMethodId
        ? and(
            eq(shots.beanId, data.beanId),
            eq(shots.brewingMethodId, data.brewingMethodId),
          )
        : eq(shots.beanId, data.beanId),
      orderBy: [desc(shots.brewedAt), desc(shots.id)],
      columns: {
        id: true,
        brewingMethodId: true,
        machineId: true,
        grinderId: true,
        basketId: true,
      },
      with: {
        brewingMethod: true,
        machine: true,
        grinder: true,
        basket: true,
        accessoryGearLinks: { with: { gear: true } },
      },
    })
    const seen = new Set<string>()
    return history.flatMap((brew) => {
      const key = JSON.stringify([
        brew.brewingMethodId,
        brew.machineId,
        brew.grinderId,
        brew.basketId,
        normalizedAccessoryIds(
          brew.accessoryGearLinks.map((link) => link.gearId),
        ),
      ])
      if (seen.has(key)) return []
      seen.add(key)
      const names = [
        brew.machine?.name,
        brew.grinder?.name,
        brew.basket?.name,
        ...brew.accessoryGearLinks.map((link) => link.gear.name),
      ].filter(Boolean)
      return [
        {
          historyShotId: brew.id,
          brewingMethodId: brew.brewingMethodId,
          brewingMethodName: brew.brewingMethod.name,
          setupName: names.join(' · ') || 'No gear recorded',
        },
      ]
    })
  })

async function loadRecommendationEvidence(request: ShotRecommendationRequest) {
  const setup = await resolveSetup(request)
  const currentDraft = isFocusedShotRecommendationRequest(request)
    ? null
    : (request.currentDraft ?? null)
  const candidateShots = await db.query.shots.findMany({
    where: setupConditions(setup),
    orderBy: [desc(shots.brewedAt), desc(shots.id)],
    columns: { id: true },
    with: { accessoryGearLinks: { columns: { gearId: true } } },
  })
  const matchingShots = candidateShots.filter((shot) =>
    haveSameAccessoryGear(
      shot.accessoryGearLinks.map((link) => link.gearId),
      setup.accessoryGearIds,
    ),
  )
  if (matchingShots.length === 0 && !currentDraft) {
    throw new ShotRecommendationError(
      'No previous brews match this bean, method, and exact gear setup.',
    )
  }
  if (
    setup.focusedShotId !== null &&
    !matchingShots.some((shot) => shot.id === setup.focusedShotId)
  ) {
    throw new ShotRecommendationError(
      'The selected brew no longer matches its recorded equipment setup.',
    )
  }

  const includedIds = recommendationHistoryIds(
    matchingShots,
    setup.focusedShotId,
    RECOMMENDATION_HISTORY_LIMIT,
  )
  const gearIds = normalizedAccessoryIds(
    [setup.machineId, setup.grinderId, setup.basketId]
      .filter((id): id is number => id !== null)
      .concat(setup.accessoryGearIds),
  )
  const [bean, purchase, brewingMethod, matchingHistory, selectedGear] =
    await Promise.all([
      db.query.beans.findFirst({
        where: (beans, { eq }) => eq(beans.id, setup.beanId),
        with: { roasterRef: true },
      }),
      setup.beanPurchaseId === null
        ? Promise.resolve(null)
        : db.query.beanPurchases.findFirst({
            where: and(
              eq(beanPurchases.id, setup.beanPurchaseId),
              eq(beanPurchases.beanId, setup.beanId),
            ),
          }),
      db.query.brewingMethods.findFirst({
        where: eq(brewingMethods.id, setup.brewingMethodId),
      }),
      includedIds.length === 0
        ? Promise.resolve([])
        : db.query.shots.findMany({
            where: inArray(shots.id, includedIds),
            orderBy: [asc(shots.brewedAt), asc(shots.id)],
            with: recommendationShotRelations,
          }),
      gearIds.length === 0
        ? Promise.resolve([])
        : db.query.gear.findMany({
            where: inArray(gear.id, gearIds),
            with: recommendationGearRelations,
          }),
    ])
  if (!bean || !brewingMethod) {
    throw new ShotRecommendationError(
      'The bean or brewing method is no longer available.',
    )
  }

  const gearById = new Map(selectedGear.map((item) => [item.id, item]))
  const gearEvidence = (id: number | null) => {
    if (id === null) return null
    return recommendationGearEvidence(id, gearById.get(id))
  }

  const shotsEvidence = matchingHistory.map((shot) =>
    recommendationShotEvidence(shot, brewingMethod.enabledParameters),
  )
  const focusedShot =
    setup.focusedShotId === null
      ? null
      : (shotsEvidence.find((shot) => shot.id === setup.focusedShotId) ?? null)
  if (setup.focusedShotId !== null && !focusedShot) {
    throw new ShotRecommendationError(
      'The selected brew could not be included in its recommendation history.',
    )
  }

  const context: ShotRecommendationContext = {
    bean: recommendationBeanEvidence(bean, purchase),
    brewingMethod: {
      id: brewingMethod.id,
      name: brewingMethod.name,
      description: brewingMethod.description,
    },
    exactGear: {
      machineOrBrewer: gearEvidence(setup.machineId),
      grinder: gearEvidence(setup.grinderId),
      basket: gearEvidence(setup.basketId),
      accessories: setup.accessoryGearIds.map(gearEvidence),
    },
    focusedShot,
    currentDraft: currentDraft
      ? {
          parameters: Object.fromEntries(
            Object.entries(currentDraft.parameters).filter(([key]) =>
              brewingMethod.enabledParameters.includes(key),
            ),
          ),
        }
      : null,
    enabledParameters: brewingMethod.enabledParameters,
    matchingShotCount: matchingShots.length,
    historyIncluded: matchingHistory.length,
    historyTruncated: matchingShots.length > matchingHistory.length,
    shotsOldestToNewest: shotsEvidence,
  }

  const gearNames = [
    gearById.get(setup.machineId ?? -1)?.name,
    gearById.get(setup.grinderId ?? -1)?.name,
    gearById.get(setup.basketId ?? -1)?.name,
    ...setup.accessoryGearIds.map((id) => gearById.get(id)?.name),
  ].filter((name): name is string => Boolean(name))
  const latestShot = matchingHistory.at(-1)
  const focusedShotRecord =
    setup.focusedShotId === null
      ? null
      : (matchingHistory.find((shot) => shot.id === setup.focusedShotId) ??
        null)

  return {
    context,
    basis: {
      beanName: bean.name,
      brewingMethodName: brewingMethod.name,
      gearNames,
      matchingShotCount: matchingShots.length,
      historyIncluded: matchingHistory.length,
      historyTruncated: matchingShots.length > matchingHistory.length,
      focusedShotAt: focusedShotRecord?.brewedAt ?? null,
      latestShotAt: latestShot?.brewedAt ?? null,
    },
  }
}

function assertRecommendationEnabled() {
  if (!isResearchEnabled()) {
    throw new ShotRecommendationError('AI recommendations are not configured')
  }
}

export const getShotRecommendation = createServerFn({ method: 'POST' })
  .validator(shotRecommendationRequestSchema)
  .handler(async ({ data: request }) => {
    assertRecommendationEnabled()
    const { context, basis } = await loadRecommendationEvidence(request)
    const recommendation = await withResourceLimits('shot-recommendation', () =>
      recommendShotFromHistory(context),
    )
    return { recommendation, basis }
  })

export const chatAboutShotRecommendation = createServerFn({ method: 'POST' })
  .validator(shotRecommendationChatRequestSchema)
  .handler(async ({ data }) => {
    assertRecommendationEnabled()
    const { context } = await loadRecommendationEvidence(data.request)
    const answer = await withResourceLimits('shot-recommendation-chat', () =>
      answerShotRecommendationQuestion(
        context,
        data.recommendation,
        data.messages,
      ),
    )
    return { answer }
  })
