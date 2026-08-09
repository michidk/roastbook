import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/coffee-shops/")({
  beforeLoad: () => {
    throw redirect({ to: "/places", replace: true })
  },
})
