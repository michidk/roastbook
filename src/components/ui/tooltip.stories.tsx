import { Button } from '@roastbook/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@roastbook/ui/tooltip'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  args: {},
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger>
        <Button variant="outline">Brew ratio</Button>
      </TooltipTrigger>
      <TooltipContent>Yield divided by the dry coffee dose.</TooltipContent>
    </Tooltip>
  ),
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}

export const Placements: Story = {
  render: () => (
    <div className="flex min-h-80 flex-wrap items-center justify-center gap-24 p-16">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side} open>
          <TooltipTrigger>
            <Button variant="outline">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Brew ratio</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}
