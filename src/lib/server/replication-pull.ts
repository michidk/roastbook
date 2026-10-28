import { and, asc, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { recipes, replicationChanges } from '@/db/schema'
import type {
  RecipeReplicationDocument,
  ReplicationCheckpoint,
} from '@/lib/replication-contracts'
import { replicationCheckpointSchema } from '@/lib/replication-contracts'
import {
  ENTITY,
  latestCheckpoint,
  recipeDocumentSchema,
  toDocument,
} from './replication-shared'

const DEFAULT_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 500

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
      if (!body.checkpoint || body.checkpoint.recipeId) {
        const sequence =
          body.checkpoint?.sequence ?? (await latestCheckpoint(tx)).sequence
        const rows = body.checkpoint?.recipeId
          ? await tx
              .select()
              .from(recipes)
              .where(gt(recipes.id, body.checkpoint.recipeId))
              .orderBy(asc(recipes.id))
              .limit(batchSize)
          : await tx
              .select()
              .from(recipes)
              .orderBy(asc(recipes.id))
              .limit(batchSize)
        const lastRecipeId = rows.at(-1)?.id
        const hasMore = rows.length === batchSize && lastRecipeId !== undefined
        return {
          documents: rows.map(toDocument),
          checkpoint: hasMore
            ? { sequence, recipeId: lastRecipeId }
            : {
                sequence: await latestCheckpoint(tx).then(
                  ({ sequence: latest }) => latest,
                ),
              },
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
