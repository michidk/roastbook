import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import {
  deleteEntityImage,
  type EntityType,
  uploadEntityImage,
} from '@/lib/server/images'
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
import { getOfflineBlob } from '@/modules/offline/blob-store'
import {
  getLocalEntityByServerId,
  markLocalEntitySynced,
  putLocalEntity,
  refreshServerEntitySyncState,
  removeLocalEntity,
  updateServerEntityRevision,
} from '@/modules/offline/local-data'
import {
  listOperations,
  updateOperation,
} from '@/modules/offline/operation-queue'
import type { OfflineOperation } from '@/modules/offline/operations'
import type { OperationExecutionResult } from '@/modules/offline/sync-operations'
import type { PendingBrewPayload } from '@/modules/offline/types'

function updatePayload(operation: OfflineOperation): Record<string, unknown> {
  const {
    baseRevision: _baseRevision,
    baseUpdatedAt: _baseUpdatedAt,
    ...payload
  } = operation.payload as Record<string, unknown>
  return {
    ...payload,
    clientOperationId: operation.id,
    ...(operation.baseRevision
      ? { baseRevision: Number(operation.baseRevision) }
      : {}),
  }
}

async function executeBrewOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  if (operation.operationType === 'create') {
    const shot = await createShot({
      data: operation.payload as PendingBrewPayload,
    })
    return { serverId: String(shot.id) }
  }
  if (operation.operationType === 'update') {
    const shot = await updateShot({
      data: updatePayload(operation) as NonNullable<
        Parameters<typeof updateShot>[0]
      >['data'],
    })
    return {
      serverId: String(shot.id),
      revision: String(shot.revision),
    }
  }
  if (operation.operationType === 'delete') {
    const id = Number(operation.entityServerId ?? operation.entityLocalId)
    await deleteShot({
      data: {
        id,
        ...(operation.baseRevision
          ? { baseRevision: Number(operation.baseRevision) }
          : {}),
        idempotent: true,
      },
    })
    return { serverId: String(id) }
  }
  if (operation.operationType === 'save-to-recipe') {
    const payload = operation.payload as {
      readonly shot?: unknown
      readonly shotId?: number
      readonly target: { readonly name: string } | { readonly recipeId: number }
    }
    if (payload.shot) {
      const result = await createShotAndSaveRecipe({
        data: operation.payload as NonNullable<
          Parameters<typeof createShotAndSaveRecipe>[0]
        >['data'],
      })
      return { serverId: String(result.shot.id) }
    }
    if (payload.shotId) {
      await saveShotAsRecipe({
        data: {
          shotId: payload.shotId,
          clientOperationId: operation.id,
          ...payload.target,
        } as NonNullable<Parameters<typeof saveShotAsRecipe>[0]>['data'],
      })
      return { serverId: String(payload.shotId) }
    }
    throw new Error('Save-to-recipe operation is missing its brew')
  }

  throw new Error(`Unsupported brew operation: ${operation.operationType}`)
}

async function executeRecipeOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  if (operation.operationType === 'create') {
    const recipe = await createRecipe({
      data: operation.payload as NonNullable<
        Parameters<typeof createRecipe>[0]
      >['data'],
    })
    return { serverId: String(recipe.id) }
  }
  if (operation.operationType === 'update') {
    const recipe = await updateRecipe({
      data: updatePayload(operation) as NonNullable<
        Parameters<typeof updateRecipe>[0]
      >['data'],
    })
    return {
      serverId: String(recipe.id),
      revision: String(recipe.revision),
    }
  }
  if (operation.operationType === 'delete') {
    const id = Number(operation.entityServerId ?? operation.entityLocalId)
    await deleteRecipe({
      data: {
        id,
        ...(operation.baseRevision
          ? { baseRevision: Number(operation.baseRevision) }
          : {}),
        idempotent: true,
      },
    })
    return { serverId: String(id) }
  }

  throw new Error(`Unsupported recipe operation: ${operation.operationType}`)
}

async function executeBrewImageOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  const payload = operation.payload as {
    readonly entityType?: EntityType
    readonly entityId?: number
    readonly imageId?: number
    readonly clientOperationId?: string
    readonly idempotent?: boolean
  }
  const entityType = payload.entityType ?? 'shots'
  const entityId = payload.entityId ?? Number(operation.entityServerId)

  if (operation.operationType === 'upload') {
    const blobKey = operation.blobKeys[0]
    if (!blobKey) throw new Error('Image data is missing from this device')
    const record = await getOfflineBlob(blobKey)
    if (!record) throw new Error('Image data is missing from this device')
    const file = new File([record.blob], record.filename, {
      type: record.mimeType,
    })
    const image = await uploadEntityImage({
      data: createEntityImageUploadFormData(
        entityType,
        entityId,
        file,
        payload.clientOperationId,
      ),
    })
    return { serverId: String(image.id) }
  }
  if (operation.operationType === 'remove-image') {
    await deleteEntityImage({
      data: {
        entityType,
        entityId,
        imageId: payload.imageId ?? 0,
        idempotent: true,
      },
    })
    return { serverId: String(entityId) }
  }

  throw new Error(`Unsupported image operation: ${operation.operationType}`)
}

export async function executeOperation(
  operation: OfflineOperation,
): Promise<OperationExecutionResult> {
  if (operation.entityType === 'brew') return executeBrewOperation(operation)
  if (operation.entityType === 'recipe') {
    return executeRecipeOperation(operation)
  }
  if (operation.entityType === 'brew-image') {
    return executeBrewImageOperation(operation)
  }

  throw new Error(
    `Unsupported offline operation: ${operation.entityType}/${operation.operationType}`,
  )
}

export async function applyEntityRevision(
  entityType: 'brew' | 'recipe',
  serverId: string,
  revision: string,
): Promise<void> {
  const operations = await listOperations({ entityType })
  for (const operation of operations) {
    if (
      operation.entityServerId === serverId &&
      (operation.operationType === 'update' ||
        operation.operationType === 'delete') &&
      (operation.status === 'pending' || operation.status === 'retryable')
    ) {
      await updateOperation(operation.id, { baseRevision: revision })
    }
  }

  await updateServerEntityRevision(entityType, serverId, revision)
}

export async function markBrewSynced(
  operation: OfflineOperation,
  serverId: string,
): Promise<void> {
  const existingByServer = await getLocalEntityByServerId('brew', serverId)
  if (existingByServer) {
    if (existingByServer.localId !== operation.entityLocalId) {
      await removeLocalEntity('brew', operation.entityLocalId).catch(
        () => undefined,
      )
    }
    await putLocalEntity({
      ...existingByServer,
      syncState: 'synced',
      updatedAt: new Date().toISOString(),
    })
    await refreshServerEntitySyncState('brew', serverId)
    return
  }

  const synced = await markLocalEntitySynced('brew', operation.entityLocalId, {
    serverId,
  })
  if (!synced && operation.operationType === 'create') {
    await putLocalEntity({
      entityType: 'brew',
      localId: operation.entityLocalId,
      serverId,
      data: operation.payload,
      syncState: 'synced',
    })
  }
  await refreshServerEntitySyncState('brew', serverId)
}
