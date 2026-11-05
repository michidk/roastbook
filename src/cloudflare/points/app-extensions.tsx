import { lazy, Suspense, useEffect, useState } from 'react'

// c15t and PostHog stay out of the main bundle and off the server.
const Extensions = lazy(() => import('./app-extensions-impl'))

export function AppExtensions({ userId }: { userId: string | null }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return (
    <Suspense fallback={null}>
      <Extensions userId={userId} />
    </Suspense>
  )
}
