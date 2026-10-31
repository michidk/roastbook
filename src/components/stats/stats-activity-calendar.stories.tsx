import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatsActivityCalendar } from './stats-activity-calendar'

const meta = {
  title: 'Stats/Activity calendar',
  component: StatsActivityCalendar,
  args: {
    activity: {
      end: '2026-10-31',
      days: Array.from({ length: 304 }, (_, i) => ({
        date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
        count: i % 7 === 0 ? 0 : i % 5,
      })),
    },
  },
} satisfies Meta<typeof StatsActivityCalendar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = {
  args: { activity: { end: '2026-10-31', days: [] } },
}
