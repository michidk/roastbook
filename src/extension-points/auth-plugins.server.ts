import '@tanstack/react-start/server-only'
import type { BetterAuthPlugin } from 'better-auth'

// Default: no extra plugins. A build extension can add Better Auth plugins,
// such as further administration tools, without forking the auth configuration.
export function authPlugins(): BetterAuthPlugin[] {
  return []
}
