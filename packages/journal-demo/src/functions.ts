/** Integrations have no transport or credentials in this edition. */
export function demoFunction(operation: string) {
  return async (_options?: unknown): Promise<unknown> => {
    if (/\/check[A-Za-z]+Enabled$/.test(operation)) return { enabled: false }
    throw new Error(
      'This feature is unavailable in the browser demo. Sign up at app.roastbook.coffee for the full experience.',
    )
  }
}
