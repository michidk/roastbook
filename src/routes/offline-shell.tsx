import { createFileRoute } from '@tanstack/react-router'

// This public route renders only the client shell. Journal loaders run in the browser.
export const Route = createFileRoute('/offline-shell')({
  component: () => null,
})
