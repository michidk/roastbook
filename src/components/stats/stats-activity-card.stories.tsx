import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatsActivityCard } from './stats-activity-card'

const meta = {
  title: 'Stats/Activity trend',
  component: StatsActivityCard,
  args: {
    bucket: 'day',
    trend: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      count: (i % 4) + 1,
      totalRated: (i % 4) + 1,
      highRated: 1,
      averageRating: 3 + i / 5,
    })),
  },
} satisfies Meta<typeof StatsActivityCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { trend: [] } }
