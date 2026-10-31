import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './textarea'

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { 'aria-label': 'Tasting notes', placeholder: 'What did you taste?' },
} satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Filled: Story = {
  args: { defaultValue: 'Sweet peach, jasmine, and a clean finish.' },
}
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
