import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { RoutePending } from '@/components/route-pending'
import { subscribeLocalChanges } from '@/journal/local/changes'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    scrollToTopSelectors: ['#app-scroll-area'],
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 15_000,
    // No page waits for its data without a placeholder.
    defaultPendingComponent: RoutePending,
  })
  // Subscribed before the first load, so changes downloaded while it runs
  // still reach the page. Writes in this tab wait for this refresh.
  if (typeof window !== 'undefined')
    subscribeLocalChanges(() => router.invalidate())

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
