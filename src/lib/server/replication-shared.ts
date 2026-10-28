import { eq, max } from 'drizzle-orm'
import { z } from 'zod'
import type { db } from '@/db'
import { type recipes, replicationChanges } from '@/db/schema'
import type {
  RecipeReplicationDocument,
  ReplicationCheckpoint,
} from '@/lib/replication-contracts'

export const ENTITY = 'recipes'
const MAX_BATCH_SIZE = 500

export const recipeDocumentSchema = z
  .object({
    id: z.string().min(1),
    serverId: z.number().int().positive().nullable().optional(),
    syncId: z.string().min(1),
    name: z.string().max(200),
    brewingMethodId: z.number().int().positive(),
    beanId: z.number().int().positive().nullable(),
    drinkTypeId: z.number().int().positive().nullable(),
    serverRevision: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
    _deleted: z.boolean().default(false),
  })
  .superRefine((document, context) => {
    if (!document._deleted && document.name.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'Recipe name is required',
      })
    }
  })

export const pushRowSchema = z.object({
  assumedMasterState: recipeDocumentSchema.optional(),
  newDocumentState: recipeDocumentSchema,
})

export const pushBodySchema = z.object({
  rows: z.array(pushRowSchema).min(1).max(MAX_BATCH_SIZE),
})

type RecipeRow = typeof recipes.$inferSelect

export type ReplicationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

function documentId(syncId: string): string {
  return syncId
}

export function toDocument(row: RecipeRow): RecipeReplicationDocument {
  return {
    id: documentId(row.syncId),
    serverId: row.id,
    syncId: row.syncId,
    name: row.name,
    brewingMethodId: row.brewingMethodId,
    beanId: row.beanId,
    drinkTypeId: row.drinkTypeId,
    serverRevision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
    _deleted: false,
  }
}

function deletedDocument(syncId: string): RecipeReplicationDocument {
  return {
    id: documentId(syncId),
    syncId,
    name: '',
    brewingMethodId: 1,
    beanId: null,
    drinkTypeId: null,
    serverRevision: 0,
    updatedAt: new Date(0).toISOString(),
    _deleted: true,
  }
}

function hasSameRecipeContent(
  incoming: RecipeReplicationDocument,
  existing: RecipeRow,
): boolean {
  return (
    incoming.syncId === existing.syncId &&
    incoming.name === existing.name &&
    incoming.brewingMethodId === existing.brewingMethodId &&
    (incoming.beanId ?? null) === existing.beanId &&
    (incoming.drinkTypeId ?? null) === existing.drinkTypeId
  )
}

export function isAlreadyAppliedRecipe(
  incoming: RecipeReplicationDocument,
  existing: RecipeRow,
  assumedMasterState: RecipeReplicationDocument | undefined,
): boolean {
  return (
    hasSameRecipeContent(incoming, existing) &&
    (!assumedMasterState ||
      existing.revision > assumedMasterState.serverRevision)
  )
}

export async function recordRecipeReplicationChange(
  tx: ReplicationTransaction,
  row: RecipeRow,
): Promise<void> {
  const document = toDocument(row)
  await tx.insert(replicationChanges).values({
    entity: ENTITY,
    documentId: document.id,
    document,
    deleted: false,
  })
}

export async function recordRecipeReplicationDeletion(
  tx: ReplicationTransaction,
  syncId: string,
): Promise<void> {
  const document = deletedDocument(syncId)
  await tx.insert(replicationChanges).values({
    entity: ENTITY,
    documentId: document.id,
    document,
    deleted: true,
  })
}

export async function latestCheckpoint(
  tx: ReplicationTransaction,
): Promise<ReplicationCheckpoint> {
  const checkpointRow = (
    await tx
      .select({ sequence: max(replicationChanges.sequence) })
      .from(replicationChanges)
      .where(eq(replicationChanges.entity, ENTITY))
  )[0]
  return { sequence: Number(checkpointRow?.sequence ?? 0) }
}
