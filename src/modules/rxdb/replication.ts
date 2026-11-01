import { replicateRxCollection } from 'rxdb/plugins/replication'
import { requireFeature } from '@/lib/app-capabilities'
import type {
  RecipeReplicationDocument,
  ReplicationCheckpoint,
} from '@/lib/replication-contracts'
import { getOfflineRxDatabase } from './offline-database'

type OfflineRecipe = Omit<RecipeReplicationDocument, '_deleted'>

type PullResult = {
  readonly documents: Array<OfflineRecipe & { readonly _deleted: boolean }>
  readonly checkpoint: ReplicationCheckpoint | undefined
}

let replicationStartPromise: ReturnType<typeof startReplication> | undefined

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  if (!response.ok)
    throw new Error(`Replication request failed (${response.status})`)
  return (await response.json()) as T
}

export async function startRecipeReplication() {
  requireFeature('offline')
  replicationStartPromise ??= startReplication().catch((error: unknown) => {
    replicationStartPromise = undefined
    throw error
  })
  return replicationStartPromise
}

async function startReplication() {
  const database = await getOfflineRxDatabase()
  return replicateRxCollection<OfflineRecipe, ReplicationCheckpoint>({
    replicationIdentifier: 'roastbook-recipes-v1',
    collection: database.recipes,
    live: true,
    retryTime: 5_000,
    waitForLeadership: true,
    toggleOnDocumentVisible: true,
    pull: {
      batchSize: 250,
      handler: async (checkpoint, batchSize): Promise<PullResult> =>
        postJson('/api/replication/pull', {
          checkpoint,
          batchSize,
        }),
    },
  })
}

export async function stopRecipeReplication(): Promise<void> {
  const running = replicationStartPromise
  replicationStartPromise = undefined
  const replication = await running?.catch(() => undefined)
  if (replication) await replication.cancel()
}
