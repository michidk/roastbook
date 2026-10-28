import { z } from 'zod'

export const replicationCheckpointSchema = z.object({
  sequence: z.number().int().nonnegative(),
  recipeId: z.number().int().positive().optional(),
})

export type ReplicationCheckpoint = z.infer<typeof replicationCheckpointSchema>

export type RecipeReplicationDocument = {
  id: string
  serverId?: number | null
  syncId: string
  name: string
  brewingMethodId: number
  beanId: number | null
  drinkTypeId: number | null
  serverRevision: number
  updatedAt: string
  _deleted?: boolean
}
