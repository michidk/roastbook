import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible'

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
  args: { defaultOpen: false },
  render: (args) => (
    <Collapsible {...args}>
      <CollapsibleTrigger render={<Button variant="outline" />}>
        Advanced parameters
      </CollapsibleTrigger>
      <CollapsibleContent className="py-4">
        Preinfusion 5 seconds · Pressure 9 bar
      </CollapsibleContent>
    </Collapsible>
  ),
} satisfies Meta<typeof Collapsible>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
