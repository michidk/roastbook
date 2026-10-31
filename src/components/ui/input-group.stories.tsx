import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from './input-group'

const meta = {
  title: 'UI/Input group',
  component: InputGroup,
  args: { className: 'max-w-sm' },
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>€</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Bag price" placeholder="16.50" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>per bag</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
} satisfies Meta<typeof InputGroup>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
