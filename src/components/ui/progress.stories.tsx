import { Progress } from '@roastbook/ui/progress'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'UI/Progress',
  component: Progress,
  args: {
    value: 45,
    'aria-label': 'Uploading pictures',
    className: 'max-w-md',
  },
} satisfies Meta<typeof Progress>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Complete: Story = { args: { value: 100 } }
export const Indeterminate: Story = { args: { value: null } }
