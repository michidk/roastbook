type Parser<T> = ((value: unknown) => T) | { parse(value: unknown): T }

export type LocalOperation = {
  readonly method: 'GET' | 'POST'
  readonly run: (data: unknown) => Promise<unknown>
}

function builder<T>(method: 'GET' | 'POST', parse: (value: unknown) => T) {
  return {
    validator<Value>(parser: Parser<Value>) {
      return builder(method, (value) =>
        typeof parser === 'function' ? parser(value) : parser.parse(value),
      )
    },
    handler<Value>(handler: (input: { data: T }) => Value): LocalOperation {
      return {
        method,
        run: async (value) => handler({ data: parse(value) }),
      }
    },
  }
}

/** Build adapter for the allowlisted journal functions in the demo worker. */
export function createServerFn({ method }: { method: 'GET' | 'POST' }) {
  return builder(method, (value) => value)
}

export function createServerOnlyFn<T>(handler: T): T {
  return handler
}
