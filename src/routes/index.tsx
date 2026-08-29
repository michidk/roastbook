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
          { title: 'Roastbook — The coffee journal you actually own' },
          {
            name: 'description',
            content:
              'A self-hosted coffee journal for brews, beans, recipes, gear, café visits, and the details that make a great cup repeatable.',
          },
        ]
      : [],
  }),
  component: DemoLandingPage,
})
