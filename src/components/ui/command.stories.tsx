import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'

const meta = {
  title: 'UI/Command search',
  component: Command,
  args: { className: 'max-w-md rounded-xl border' },
  render: (args) => (
    <Command {...args}>
      <CommandInput placeholder="Search actions…" />
      <CommandList>
        <CommandEmpty>No matching actions.</CommandEmpty>
        <CommandGroup heading="Journal">
          <CommandItem value="new brew" onSelect={fn()}>
            Log a brew
          </CommandItem>
          <CommandItem value="beans" onSelect={fn()}>
            Browse beans
          </CommandItem>
          <CommandItem value="cafes" onSelect={fn()}>
            Find a café
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
} satisfies Meta<typeof Command>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
