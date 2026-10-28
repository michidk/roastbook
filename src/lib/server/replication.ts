import { and, asc, eq, gt, max } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { recipes, replicationChanges } from '@/db/schema'
import type {
  RecipeReplicationDocument,
  ReplicationCheckpoint,
} from '@/lib/replication-contracts'
import { replicationCheckpointSchema } from '@/lib/replication-contracts'

const ENTITY = 'recipes'
const DEFAULT_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 500

const recipeDocumentSchema = z
  .object({
    id: z.string().min(1),
    serverId: z.number().int().positive().nullable().optional(),
    syncId: z.string().min(1),
    name: z.string().max(200),
    brewingMethodId: z.number().int().positive(),
    beanId: z.number().int().positive().nullable(),
    drinkTypeId: z.number().int().positive().nullable(),
    revision: z.number().int().nonnegative(),
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

const pushRowSchema = z.object({
  assumedMasterState: recipeDocumentSchema.optional(),
  newDocumentState: recipeDocumentSchema,
})

const pushBodySchema = z.object({
  rows: z.array(pushRowSchema).min(1).max(MAX_BATCH_SIZE),
})

type RecipeRow = typeof recipes.$inferSelect

type ReplicationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

function documentId(syncId: string): string {
  return syncId
}

function toDocument(row: RecipeRow): RecipeReplicationDocument {
  return {
    id: documentId(row.syncId),
    serverId: row.id,
    syncId: row.syncId,
    name: row.name,
    brewingMethodId: row.brewingMethodId,
    beanId: row.beanId,
    drinkTypeId: row.drinkTypeId,
    revision: row.revision,
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
    revision: 0,
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

function isAlreadyAppliedRecipe(
  incoming: RecipeReplicationDocument,
  existing: RecipeRow,
  assumedMasterState: RecipeReplicationDocument | undefined,
): boolean {
  return (
    hasSameRecipeContent(incoming, existing) &&
    (!assumedMasterState || existing.revision > assumedMasterState.revision)
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

async function latestCheckpoint(
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

export async function pullRecipes(input: unknown): Promise<{
  documents: RecipeReplicationDocument[]
  checkpoint: ReplicationCheckpoint
}> {
  const body = z
    .object({
      checkpoint: replicationCheckpointSchema.optional(),
      batchSize: z.number().int().positive().max(MAX_BATCH_SIZE).optional(),
    })
    .parse(input)
  const batchSize = body.batchSize ?? DEFAULT_BATCH_SIZE

  return db.transaction(
    async (tx) => {
      if (!body.checkpoint) {
        const rows = await tx.select().from(recipes).orderBy(asc(recipes.id))
        return {
          documents: rows.map(toDocument),
          checkpoint: await latestCheckpoint(tx),
        }
      }

      const changes = await tx
        .select()
        .from(replicationChanges)
        .where(
          and(
            eq(replicationChanges.entity, ENTITY),
            gt(replicationChanges.sequence, body.checkpoint.sequence),
          ),
        )
        .orderBy(asc(replicationChanges.sequence))
        .limit(batchSize)

      const documents = changes.map((change) =>
        recipeDocumentSchema.parse(change.document),
      )
      const checkpoint = changes.at(-1)
        ? { sequence: changes.at(-1)?.sequence ?? body.checkpoint.sequence }
        : body.checkpoint
      return { documents, checkpoint }
    },
    { isolationLevel: 'repeatable read' },
  )
}

export async function pushRecipes(
  input: unknown,
): Promise<RecipeReplicationDocument[]> {
  const { rows } = pushBodySchema.parse(input)
  return db.transaction(async (tx) => {
    const conflicts: RecipeReplicationDocument[] = []

    for (const row of rows) {
      const conflict = await pushRecipe(tx, row)
      if (conflict) conflicts.push(conflict)
    }

    return conflicts
  })
}

async function pushRecipe(
  tx: ReplicationTransaction,
  row: z.infer<typeof pushRowSchema>,
): Promise<RecipeReplicationDocument | undefined> {
  const incoming = row.newDocumentState
  const existing = await tx.query.recipes.findFirst({
    where: eq(recipes.syncId, incoming.syncId),
  })

  if (incoming._deleted) {
    if (!existing) return
    if (
      !row.assumedMasterState ||
      existing.revision !== row.assumedMasterState.revision
    ) {
      return toDocument(existing)
    }
    await tx.delete(recipes).where(eq(recipes.id, existing.id))
    await recordRecipeReplicationDeletion(tx, existing.syncId)
    return
  }

  if (!existing) {
    const [created] = await tx
      .insert(recipes)
      .values({
        name: incoming.name,
        syncId: incoming.syncId,
        brewingMethodId: incoming.brewingMethodId,
        beanId: incoming.beanId ?? null,
        drinkTypeId: incoming.drinkTypeId ?? null,
        revision: 0,
      })
      .returning()
    if (!created) throw new Error('Recipe replication insert returned no row')
    await recordRecipeReplicationChange(tx, created)
    return
  }

  // A retried request can arrive after its transaction committed but before
  // the client received the response. Treat the document as already applied.
  if (isAlreadyAppliedRecipe(incoming, existing, row.assumedMasterState)) {
    return
  }

  if (
    !row.assumedMasterState ||
    existing.revision !== row.assumedMasterState.revision
  ) {
    return toDocument(existing)
  }

  const [updated] = await tx
    .update(recipes)
    .set({
      name: incoming.name,
      brewingMethodId: incoming.brewingMethodId,
      beanId: incoming.beanId ?? null,
      drinkTypeId: incoming.drinkTypeId ?? null,
      revision: existing.revision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(eq(recipes.id, existing.id), eq(recipes.revision, existing.revision)),
    )
    .returning()
  if (!updated) {
    const current = await tx.query.recipes.findFirst({
      where: eq(recipes.id, existing.id),
    })
    return current ? toDocument(current) : undefined
  }
  await recordRecipeReplicationChange(tx, updated)
}
