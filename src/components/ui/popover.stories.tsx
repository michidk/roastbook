import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

const meta = {
  title: 'UI/Popover',
  component: Popover,
  args: {},
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Recipe details
      </PopoverTrigger>
      <PopoverContent>
        <h2 className="font-semibold">Morning espresso</h2>
        <p>18 g in, 36 g out, in 28 seconds.</p>
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta<typeof Popover>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
