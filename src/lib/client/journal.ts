import type { z } from 'zod'
import { requireFeature } from '@/lib/app-capabilities'
import type { newShotPayload } from '@/lib/new-shot-payload'
import { recipePayload } from '@/lib/new-shot-payload'
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { recipeTargetSchema, shotRecipeTargetSchema } from '@/lib/recipe-target'
import type { getRecipe } from '@/lib/server/recipes'
import {
  createRecipe,
  deleteRecipe,
  saveShotAsRecipe,
  updateRecipe,
} from '@/lib/server/recipes'
import {
  createShot,
  createShotAndSaveRecipe,
  deleteShot,
  updateShot,
} from '@/lib/server/shots'
import { shotCreateSchema, shotUpdateSchema } from '@/lib/server-validation'
import { shotFormValuesFrom } from '@/modules/brews/shot-form-values'
import {
  type EntityMutationSummary,
  enqueueBrewSaveToRecipe,
  enqueueEntityDelete,
  enqueueEntityUpdate,
  enqueueRecipeCreate,
  enqueueSavedBrewToRecipe,
} from '@/modules/offline/entity-operations'
import { runJournalMutation } from '@/modules/offline/mutation'
import { enqueuePendingBrew } from '@/modules/offline/pending-store'
import {
  holdPendingBrewForTasting,
  releasePendingBrewForTasting,
} from '@/modules/offline/tasting-holds'
import type { PendingBrewSummary } from '@/modules/offline/types'

type BrewCreate = ReturnType<typeof newShotPayload> & {
  readonly clientOperationId?: string
}
type BrewUpdate = Omit<z.input<typeof shotUpdateSchema>, 'tasteTagIds'> & {
  readonly tasteTagIds?: readonly number[]
}
type RecipeCreate = z.input<typeof recipeCreateSchema>
type RecipeUpdate = z.input<typeof recipeUpdateSchema>
type RecipeTarget = { readonly recipeId: number } | { readonly name: string }

type MutationDetails = { readonly details: EntityMutationSummary }

export function addRecipe(data: RecipeCreate, details: EntityMutationSummary) {
  requireFeature('journal-write')
  const validated = recipeCreateSchema.parse(data)
  const payload = {
    ...validated,
    clientOperationId: data.clientOperationId ?? crypto.randomUUID(),
  }
  return runJournalMutation({
    send: () => createRecipe({ data: payload }),
    enqueue: () =>
      enqueueRecipeCreate(payload, details, payload.clientOperationId),
  })
}

export function editRecipe(data: RecipeUpdate, details: EntityMutationSummary) {
  requireFeature('journal-write')
  const validated = recipeUpdateSchema.parse(data)
  const payload = {
    ...validated,
    clientOperationId: data.clientOperationId ?? crypto.randomUUID(),
  }
  return runJournalMutation({
    send: () => updateRecipe({ data: payload }),
    enqueue: () =>
      enqueueEntityUpdate({
        entityType: 'recipe',
        entityId: payload.id,
        payload,
        clientOperationId: payload.clientOperationId,
        details,
        baseRevision:
          payload.baseRevision === undefined
            ? null
            : String(payload.baseRevision),
      }),
  })
}

export function editBrew(data: BrewUpdate, details: EntityMutationSummary) {
  requireFeature('journal-write')
  const validated = shotUpdateSchema.parse(data)
  const payload = {
    ...validated,
    clientOperationId: data.clientOperationId ?? crypto.randomUUID(),
  }
  return runJournalMutation({
    send: () => updateShot({ data: payload }),
    enqueue: () =>
      enqueueEntityUpdate({
        entityType: 'brew',
        entityId: payload.id,
        payload,
        clientOperationId: payload.clientOperationId,
        details,
        baseRevision:
          payload.baseRevision === undefined
            ? null
            : String(payload.baseRevision),
      }),
  })
}

export async function removeJournalEntity({
  entityType,
  id,
  revision,
  details,
}: MutationDetails & {
  readonly entityType: 'brew' | 'recipe'
  readonly id: number
  readonly revision: number
}) {
  const result = await runJournalMutation({
    send: async () => {
      if (entityType === 'brew')
        await deleteShot({
          data: { id, baseRevision: revision, idempotent: true },
        })
      else
        await deleteRecipe({
          data: { id, baseRevision: revision, idempotent: true },
        })
    },
    enqueue: () =>
      enqueueEntityDelete({
        entityType,
        entityId: id,
        baseRevision: String(revision),
        details,
      }),
  })
  if (result.kind === 'saved') {
    const { removeCachedEntityDetail } = await import(
      '@/modules/offline/entity-detail-cache'
    )
    await removeCachedEntityDetail(entityType, id).catch(() => undefined)
  }
  return result
}

export function saveBrewToRecipe(
  data: z.input<typeof shotRecipeTargetSchema>,
  details: EntityMutationSummary,
) {
  requireFeature('journal-write')
  const validated = shotRecipeTargetSchema.parse(data)
  const payload = {
    ...validated,
    clientOperationId: data.clientOperationId ?? crypto.randomUUID(),
  }
  return runJournalMutation({
    send: () => saveShotAsRecipe({ data: payload }),
    enqueue: () =>
      enqueueSavedBrewToRecipe({
        shotId: payload.shotId,
        target:
          'recipeId' in payload && payload.recipeId
            ? { recipeId: payload.recipeId }
            : { name: payload.name ?? 'Recipe' },
        details,
        clientOperationId: payload.clientOperationId,
      }),
  })
}

export async function addBrew({
  data,
  summary,
  target,
  holdForTasting = false,
}: {
  readonly data: BrewCreate
  readonly summary: PendingBrewSummary
  readonly target: RecipeTarget | null
  readonly holdForTasting?: boolean
}) {
  requireFeature('journal-write')
  shotCreateSchema.parse(data)
  if (target) recipeTargetSchema.parse(target)
  const operationId = data.clientOperationId ?? crypto.randomUUID()
  const payload = { ...data, clientOperationId: operationId }
  return runJournalMutation({
    send: async () =>
      target
        ? (await createShotAndSaveRecipe({ data: { shot: payload, target } }))
            .shot
        : createShot({ data: payload }),
    enqueue: async () => {
      if (holdForTasting) holdPendingBrewForTasting(operationId)
      try {
        if (target) {
          await enqueueBrewSaveToRecipe(
            operationId,
            { shot: payload, target },
            {
              label: summary.beanName ?? 'Brew',
              detail:
                'name' in target
                  ? `New recipe: ${target.name}`
                  : 'Existing recipe',
            },
          )
        } else {
          await enqueuePendingBrew({
            operationId,
            payload,
            summary,
            createdAt: new Date().toISOString(),
            attempts: 0,
            status: 'pending',
          })
        }
      } catch (error) {
        if (holdForTasting) releasePendingBrewForTasting(operationId)
        throw error
      }
      return operationId
    },
  })
}

export function copyRecipe(
  recipe: NonNullable<Awaited<ReturnType<typeof getRecipe>>>,
) {
  return addRecipe(
    {
      name: `${recipe.name} (copy)`,
      ...recipePayload(shotFormValuesFrom(recipe)),
    },
    { label: `${recipe.name} (copy)`, detail: 'Recipe' },
  )
}
