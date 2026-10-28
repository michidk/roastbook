import { replicateRxCollection } from 'rxdb/plugins/replication'
import type { ReplicationCheckpoint } from './contracts'
import type { OfflineRecipe } from './recipes'
import { getRecipeDatabase } from './recipes'

type PullResult = {
  readonly documents: Array<OfflineRecipe & { readonly _deleted: boolean }>
  readonly checkpoint: ReplicationCheckpoint | undefined
}

let replicationStarted = false

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
  if (replicationStarted) return
  const database = await getRecipeDatabase()
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
  replicationStarted = true
}
