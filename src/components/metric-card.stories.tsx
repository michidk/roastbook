import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coffee } from 'lucide-react'
import { MetricCard } from './metric-card'

const meta = {
  title: 'Journal/Metric card',
  component: MetricCard,
  args: {
    label: 'Brews this month',
    value: '42',
    detail: '12 more than last month',
    icon: Coffee,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MetricCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Hero: Story = { args: { variant: 'hero' } }
export const Quiet: Story = { args: { variant: 'quiet' } }
export const Linked: Story = { args: { href: '/brews' } }
