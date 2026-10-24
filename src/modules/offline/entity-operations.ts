import { deleteOfflineBlob, putOfflineBlob } from '@/modules/offline/blob-store'
import {
  getLocalEntityByServerId,
  putLocalEntity,
  removeLocalEntity,
} from '@/modules/offline/local-data'
import {
  cancelOperation,
  putOperation,
} from '@/modules/offline/operation-queue'
import {
  DEFAULT_OWNER_KEY,
  type OfflineEntityType,
  type OfflineOperation,
} from '@/modules/offline/operations'
import { requestPendingSync } from '@/modules/offline/sync-trigger'

type SyncableEntityType = Extract<OfflineEntityType, 'brew' | 'recipe'>

export interface EntityMutationSummary {
  readonly label: string
  readonly detail?: string | null
}

interface EntityMutationInput {
  readonly entityType: SyncableEntityType
  readonly entityId: number
  readonly payload: unknown
  readonly details: EntityMutationSummary
  readonly baseRevision?: string | null
}

function newOperation(
  input: Omit<
    OfflineOperation,
    | 'id'
    | 'idempotencyKey'
    | 'ownerKey'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'attempts'
    | 'lastError'
    | 'nextAttemptAt'
    | 'acknowledgedAt'
    | 'cancelledAt'
    | 'blobKeys'
  > & { readonly id?: string; readonly blobKeys?: readonly string[] },
): OfflineOperation {
  const id = input.id ?? crypto.randomUUID()
  const now = new Date().toISOString()
  return {
    ...input,
    id,
    idempotencyKey: id,
    ownerKey: DEFAULT_OWNER_KEY,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: null,
    acknowledgedAt: null,
    cancelledAt: null,
    blobKeys: input.blobKeys ?? [],
  }
}

function cachedEntityKey(entityType: SyncableEntityType): 'shot' | 'recipe' {
  return entityType === 'brew' ? 'shot' : 'recipe'
}

async function mergeCachedEntity(
  entityType: SyncableEntityType,
  entityId: number,
  payload: unknown,
): Promise<void> {
  const cached = await getLocalEntityByServerId<Record<string, unknown>>(
    entityType,
    String(entityId),
  )
  if (!cached) return

  const key = cachedEntityKey(entityType)
  const current = cached.data[key]
  if (!current || typeof current !== 'object') return

  const { baseUpdatedAt: _baseUpdatedAt, ...entityChanges } = payload as Record<
    string,
    unknown
  >
  await putLocalEntity({
    ...cached,
    data: {
      ...cached.data,
      [key]: { ...current, ...entityChanges },
    },
    syncState: 'pending',
    updatedAt: new Date().toISOString(),
  })
}

export async function enqueueEntityUpdate(
  input: EntityMutationInput,
): Promise<string> {
  const operation = newOperation({
    entityType: input.entityType,
    operationType: 'update',
    entityLocalId: String(input.entityId),
    entityServerId: String(input.entityId),
    payload: input.payload,
    details: input.details,
    dependencyIds: [],
    baseRevision: input.baseRevision ?? null,
  })
  await putOperation(operation)
  await mergeCachedEntity(input.entityType, input.entityId, input.payload)
  requestPendingSync()
  return operation.id
}

export async function enqueueEntityDelete(
  input: Omit<EntityMutationInput, 'payload'>,
): Promise<string> {
  const operation = newOperation({
    entityType: input.entityType,
    operationType: 'delete',
    entityLocalId: String(input.entityId),
    entityServerId: String(input.entityId),
    payload: null,
    details: input.details,
    dependencyIds: [],
    baseRevision: input.baseRevision ?? null,
  })
  await putOperation(operation)

  const cached = await getLocalEntityByServerId(
    input.entityType,
    String(input.entityId),
  )
  await removeLocalEntity(
    input.entityType,
    cached?.localId ?? String(input.entityId),
  )
  requestPendingSync()
  return operation.id
}

export async function enqueueRecipeCreate(
  payload: unknown,
  details: EntityMutationSummary,
): Promise<string> {
  const id = crypto.randomUUID()
  const operation = newOperation({
    id,
    entityType: 'recipe',
    operationType: 'create',
    entityLocalId: crypto.randomUUID(),
    entityServerId: null,
    payload: {
      ...(payload as Record<string, unknown>),
      clientOperationId: id,
    },
    details,
    dependencyIds: [],
    baseRevision: null,
  })
  await putOperation(operation)
  requestPendingSync()
  return operation.id
}

export async function enqueueBrewSaveToRecipe(
  clientOperationId: string,
  payload: unknown,
  details: EntityMutationSummary,
): Promise<string> {
  const operation = newOperation({
    id: clientOperationId,
    entityType: 'brew',
    operationType: 'save-to-recipe',
    entityLocalId: clientOperationId,
    entityServerId: null,
    payload,
    details,
    dependencyIds: [],
    baseRevision: null,
  })
  await putOperation(operation)
  requestPendingSync()
  return operation.id
}

export type OfflineImageEntityType = 'shots' | 'bean-purchases' | 'gear'

export async function enqueueImageUpload(input: {
  readonly entityType: OfflineImageEntityType
  readonly entityId: number
  readonly file: File
  readonly details: EntityMutationSummary
}): Promise<string> {
  const id = crypto.randomUUID()
  const blob = await putOfflineBlob({
    entityType: 'brew-image',
    entityId: input.entityId,
    file: input.file,
  })
  const operation = newOperation({
    id,
    entityType: 'brew-image',
    operationType: 'upload',
    entityLocalId: String(input.entityId),
    entityServerId: String(input.entityId),
    payload: {
      entityType: input.entityType,
      entityId: input.entityId,
      clientOperationId: id,
      filename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
    },
    details: input.details,
    dependencyIds: [],
    baseRevision: null,
    blobKeys: [blob.key],
  })

  try {
    await putOperation(operation)
  } catch (error) {
    await deleteOfflineBlob(blob.key).catch(() => undefined)
    throw error
  }

  requestPendingSync()
  return operation.id
}

export async function enqueueImageDelete(input: {
  readonly entityType: OfflineImageEntityType
  readonly entityId: number
  readonly imageId: number
  readonly details: EntityMutationSummary
}): Promise<string> {
  const operation = newOperation({
    entityType: 'brew-image',
    operationType: 'remove-image',
    entityLocalId: String(input.entityId),
    entityServerId: String(input.entityId),
    payload: {
      entityType: input.entityType,
      entityId: input.entityId,
      imageId: input.imageId,
      idempotent: true,
    },
    details: input.details,
    dependencyIds: [],
    baseRevision: null,
  })
  await putOperation(operation)
  requestPendingSync()
  return operation.id
}

export async function acceptServerConflict(
  operation: OfflineOperation,
): Promise<void> {
  await cancelOperation(operation.id)

  if (!operation.entityServerId) return
  const cached = await getLocalEntityByServerId(
    operation.entityType,
    operation.entityServerId,
  )
  if (cached) {
    await removeLocalEntity(operation.entityType, cached.localId)
  }
}
