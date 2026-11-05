import { demoAiFunction, hasDemoAiResponse } from './ai'

/** Demo integrations use local presets or fail without transport or credentials. */
export function demoFunction(operation: string) {
  return async (options?: unknown): Promise<unknown> => {
    if (hasDemoAiResponse(operation)) return demoAiFunction(operation, options)
    if (/\/check[A-Za-z]+Enabled$/.test(operation)) return { enabled: false }
    throw new Error(
      'This feature is unavailable in the browser demo. Sign up at app.roastbook.coffee for the full experience.',
    )
  }
}
