import '@tanstack/react-start/server-only'

type EnvironmentParser<T> = (variables: Record<string, string | undefined>) => T

// Default no-ops. A build extension may replace this module to run the
// application on a managed runtime that supplies its own services.
export const getExtensionRuntimeKey = (): object | undefined => undefined

export const resolveExtensionEnvironment = <T>(
  _parse: EnvironmentParser<T>,
): T | undefined => undefined
