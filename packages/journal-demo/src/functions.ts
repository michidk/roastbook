import { demoAiFunction, hasDemoAiResponse } from './ai'

/** Demo integrations use local presets or fail without transport or credentials. */
export function demoFunction(operation: string) {
  return async (options?: unknown): Promise<unknown> => {
    if (hasDemoAiResponse(operation)) {
      const response = await demoAiFunction(operation, options)
      if (
        operation === 'shot-recommendations/getShotRecommendation' ||
        operation === 'shot-recommendations/chatAboutShotRecommendation' ||
        operation === 'research/researchBeanInfo'
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1_500 + Math.random() * 2_000),
        )
      }
      return response
    }
    if (/\/check[A-Za-z]+Enabled$/.test(operation)) return { enabled: false }
    throw new Error(
      'This feature is unavailable in the browser demo. Sign up at app.roastbook.coffee for the full experience.',
    )
  }
}
