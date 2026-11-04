import { listOperations } from './operation-queue'

/** Earlier saved work drains through its original endpoints before new journal edits. */
export async function hasEarlierPendingChanges(): Promise<boolean> {
  return (await listOperations()).some(
    (entry) => !['acknowledged', 'cancelled'].includes(entry.status),
  )
}
export async function assertEarlierChangesResolved(): Promise<void> {
  if (await hasEarlierPendingChanges())
    throw new Error(
      'Finish or resolve your earlier offline changes in Pending changes before editing this journal. Your saved changes are preserved.',
    )
}
