import { replicateRxCollection } from 'rxdb/plugins/replication'
import type { ReplicationCheckpoint } from '@/lib/replication-contracts'
import { getOfflineRxDatabase } from './offline-database'
import type { OfflineRecipe } from './recipes'

type PullResult = {
  readonly documents: Array<OfflineRecipe & { readonly _deleted: boolean }>
  readonly checkpoint: ReplicationCheckpoint | undefined
}

let replicationStartPromise: Promise<void> | undefined

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

export async function startRecipeReplication(): Promise<void> {
  replicationStartPromise ??= startReplication().catch((error: unknown) => {
    replicationStartPromise = undefined
    throw error
  })
  return replicationStartPromise
}

async function startReplication(): Promise<void> {
  const database = await getOfflineRxDatabase()
  replicateRxCollection<OfflineRecipe, ReplicationCheckpoint>({
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
    push: {
      batchSize: 50,
      handler: (rows) => postJson('/api/replication/push', { rows }),
    },
  })
}
