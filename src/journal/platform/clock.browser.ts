// Browser platform: a write records the time and identifiers it generates, so
// the server replay and later rebases produce identical rows.
import { currentScope } from '@/journal/local/client'

export function journalNow(): Date {
  const scope = currentScope()
  if (!scope) return new Date()
  const [recorded] = scope.recorded.now ?? []
  if (typeof recorded === 'string') return new Date(recorded)
  const now = new Date()
  scope.recorded.now = [now.toISOString()]
  return now
}

export function journalUuid(): string {
  const scope = currentScope()
  if (!scope) return crypto.randomUUID()
  if (scope.replaying) {
    const [recorded] = scope.recorded.uuid?.splice(0, 1) ?? []
    if (typeof recorded !== 'string')
      throw new Error('The saved change no longer matches its recorded values')
    return recorded
  }
  const id = crypto.randomUUID()
  scope.recorded.uuid = [...(scope.recorded.uuid ?? []), id]
  return id
}
