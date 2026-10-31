import type { Meta, StoryObj } from '@storybook/react-vite'
import { EntityNotFound } from './entity-not-found'

const meta = {
  title: 'Journal/Record not found',
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm [&>[data-slot=page]>div]:py-0">
        <Story />
      </div>
    ),
  ],
  component: EntityNotFound,
  args: { entity: 'Coffee', backTo: '/beans', backLabel: 'Back to coffees' },
} satisfies Meta<typeof EntityNotFound>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
