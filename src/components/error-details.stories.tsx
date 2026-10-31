import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorDetails } from './error-details'

const meta = {
  title: 'Journal/Error details',
  component: ErrorDetails,
  args: { error: new Error('Could not save the brew. Try again.') },
} satisfies Meta<typeof ErrorDetails>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
