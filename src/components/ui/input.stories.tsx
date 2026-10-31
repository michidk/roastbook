import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'
import { Label } from './label'

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { id: 'coffee-name', placeholder: 'e.g. Ethiopia Guji' },
  decorators: [
    (Story) => (
      <div className="max-w-sm space-y-2">
        <Label htmlFor="coffee-name">Coffee name</Label>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Filled: Story = { args: { defaultValue: 'Ethiopia Guji' } }
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Ethiopia Guji' },
}
export const Invalid: Story = {
  args: { 'aria-invalid': true, 'aria-describedby': 'coffee-name-error' },
  render: (args) => (
    <>
      <Input {...args} />
      <p id="coffee-name-error" className="text-sm text-destructive-text">
        Enter a coffee name.
      </p>
    </>
  ),
}
