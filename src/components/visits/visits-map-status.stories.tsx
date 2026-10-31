import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VisitsMapStatus } from './visits-map-status'

const meta = {
  title: 'Maps/Map status',
  component: VisitsMapStatus,
  args: { status: 'loading', onRetry: fn(), retryButtonRef: { current: null } },

  decorators: [
    (Story) => (
      <div className="w-full max-w-sm overflow-hidden rounded-2xl [&>div]:relative [&>div]:inset-auto [&>div]:p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VisitsMapStatus>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Unavailable: Story = { args: { status: 'error' } }
