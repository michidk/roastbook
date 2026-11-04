import '@tanstack/react-start/server-only'
import { AsyncLocalStorage } from 'node:async_hooks'

/** Values a browser recorded while it ran a journal write, by kind and in call order. */
export type RecordedValues = Record<string, unknown[]>

const replay = new AsyncLocalStorage<{
  values: RecordedValues
  newPaths: Set<string>
}>()

/** Runs a replayed write so generated identifiers and paths match the browser. */
export function withRecordedValues<T>(values: RecordedValues, work: () => T) {
  return replay.run(
    { values: structuredClone(values), newPaths: new Set() },
    work,
  )
}

export function takeRecordedValues(kind: string, count: number) {
  const scope = replay.getStore()
  if (!scope) return undefined
  const queue = scope.values[kind] ?? []
  if (queue.length < count)
    throw new Error('The replayed change does not match its recorded values')
  return queue.splice(0, count)
}

/** Paths chosen by the browser must be new objects. */
export function isReplayedPath(path: string) {
  return replay.getStore()?.newPaths.has(path) ?? false
}

export function markReplayedPath(path: string) {
  replay.getStore()?.newPaths.add(path)
}
