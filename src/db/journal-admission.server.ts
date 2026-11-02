import '@tanstack/react-start/server-only'

export class JournalBusyError extends Error {
  constructor() {
    super('Your journal is busy. Try again shortly.')
  }
}

type WaitingJournal = {
  owner: string
  admit: (release: () => void) => void
  cleanup: () => void
}

/** Queue outside PostgreSQL so one account never occupies connections with waiters. */
export class JournalAdmission {
  readonly #active = new Set<string>()
  readonly #pending: WaitingJournal[] = []
  readonly #counts = new Map<string, number>()

  readonly #maxActive: number
  readonly #maxPending: number
  readonly #maxPerOwner: number
  readonly #queueTimeoutMs: number

  constructor({
    maxActive = 8,
    maxPending = 128,
    maxPerOwner = 16,
    queueTimeoutMs = 5_000,
  } = {}) {
    this.#maxActive = maxActive
    this.#maxPending = maxPending
    this.#maxPerOwner = maxPerOwner
    this.#queueTimeoutMs = queueTimeoutMs
  }

  acquire(owner: string, signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(signal.reason)
    if (
      this.#pending.length >= this.#maxPending ||
      (this.#counts.get(owner) ?? 0) >= this.#maxPerOwner
    )
      return Promise.reject(new JournalBusyError())
    this.#counts.set(owner, (this.#counts.get(owner) ?? 0) + 1)
    return new Promise((admit, reject) => {
      const cancel = (reason: unknown) => {
        const index = this.#pending.indexOf(waiting)
        if (index < 0) return
        this.#pending.splice(index, 1)
        waiting.cleanup()
        this.#decrement(owner)
        reject(reason)
      }
      const onAbort = () => cancel(signal?.reason)
      const timeout = setTimeout(
        () => cancel(new JournalBusyError()),
        this.#queueTimeoutMs,
      )
      const waiting: WaitingJournal = {
        owner,
        admit,
        cleanup: () => {
          clearTimeout(timeout)
          signal?.removeEventListener('abort', onAbort)
        },
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      this.#pending.push(waiting)
      this.#drain()
    })
  }

  #decrement(owner: string) {
    const count = (this.#counts.get(owner) ?? 1) - 1
    if (count === 0) this.#counts.delete(owner)
    else this.#counts.set(owner, count)
  }

  #drain() {
    while (this.#active.size < this.#maxActive) {
      const index = this.#pending.findIndex(
        (waiting) => !this.#active.has(waiting.owner),
      )
      if (index < 0) return
      const waiting = this.#pending.splice(index, 1)[0]
      if (!waiting) return
      waiting.cleanup()
      this.#active.add(waiting.owner)
      let released = false
      waiting.admit(() => {
        if (released) return
        released = true
        this.#active.delete(waiting.owner)
        this.#decrement(waiting.owner)
        this.#drain()
      })
    }
  }
}
