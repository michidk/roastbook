import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

const meta = {
  title: 'UI/Dropdown menu',
  component: DropdownMenu,
  args: {},
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Brew actions
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={fn()}>Edit brew</DropdownMenuItem>
        <DropdownMenuItem onClick={fn()}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem disabled>Export unavailable</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={fn()}>Delete brew</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof DropdownMenu>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
