import type { Meta, StoryObj } from '@storybook/react-vite'
import { RouteError } from './route-error'

const meta = {
  title: 'Journal/Route error',
  decorators: [
    (Story) => (
      <div className="w-full max-w-md [&>[data-slot=page]]:min-h-0">
        <Story />
      </div>
    ),
  ],
  component: RouteError,
  args: {
    error: new Error('The brew could not be loaded.'),
    backTo: '/brews',
    backLabel: 'Back to brews',
  },
} satisfies Meta<typeof RouteError>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
