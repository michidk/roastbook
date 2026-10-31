import type { Meta, StoryObj } from '@storybook/react-vite'
import { RouteError } from './route-error'

const meta = {
  title: 'Journal/Route error',
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
