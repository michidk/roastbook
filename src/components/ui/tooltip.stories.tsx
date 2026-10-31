import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

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
