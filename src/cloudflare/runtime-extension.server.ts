import '@tanstack/react-start/server-only'
import { getCloudflareRuntime } from './context.server'

const environments = new WeakMap<object, unknown>()

export const getExtensionRuntimeKey = () => getCloudflareRuntime()?.bindings

export function resolveExtensionEnvironment<T>(
  parse: (variables: Record<string, string | undefined>) => T,
): T | undefined {
  const runtime = getCloudflareRuntime()
  if (!runtime) return undefined
  const cached = environments.get(runtime.bindings)
  if (cached) return cached as T
  const { variables } = runtime
  if (
    variables.AUTH_ENABLED !== 'true' ||
    variables.DEPLOYMENT_MODE !== 'hosted'
  )
    throw new Error('Hosted Workers require authentication')
  const environment = parse({ ...variables, AUTH_IP_HEADER: 'x-real-ip' })
  environments.set(runtime.bindings, environment)
  return environment
}
