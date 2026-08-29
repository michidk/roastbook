import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEMO_MODE } from '@/lib/build-mode'
import { DemoLandingPage } from '@/routes/-components/demo-landing-page'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!DEMO_MODE) throw redirect({ to: '/overview' })
  },
  head: () => ({
    meta: DEMO_MODE
      ? [
          { title: 'Roastbook — AI-powered, self-hosted coffee journal' },
          {
            name: 'description',
            content:
              'Scan coffee bags, research beans and gear, and get brew recommendations grounded in your own history — in a journal you self-host.',
          },
        ]
      : [],
  }),
  component: DemoLandingPage,
})
