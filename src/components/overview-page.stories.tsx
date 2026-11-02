import type { Meta, StoryObj } from '@storybook/react-vite'
import { OverviewPage } from '@/routes/overview/-components/overview-page'

const meta = {
  title: 'Journal/Overview',
  component: OverviewPage,
  args: {
    stats: {
      totalShots: 0,
      activeBeans: 0,
      shotsThisMonth: 0,
      cafeVisits: 0,
      coffeeShops: 0,
    },
    recentShots: [],
  },
} satisfies Meta<typeof OverviewPage>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
