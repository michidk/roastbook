import { createFileRoute, redirect } from "@tanstack/react-router"

/**
 * Places were merged into the visits page. This route is kept as a redirect so
 * existing bookmarks and the detail route's parent path still resolve.
 */
export const Route = createFileRoute("/coffee-shops/")({
  beforeLoad: () => {
    throw redirect({ to: "/visits", replace: true })
  },
})
