import { ScrollArea } from '@roastbook/ui/scroll-area'
import { Separator } from '@roastbook/ui/separator'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'UI/Scroll area',
  component: ScrollArea,
  args: { className: 'h-64 max-w-sm rounded-xl border p-4' },
  render: (args) => (
    <ScrollArea {...args}>
      {Array.from({ length: 20 }, (_, i) => `Brew ${i + 1}`).map((brew) => (
        <div key={brew}>
          <p className="py-3">{brew} · Ethiopia Guji</p>
          <Separator />
        </div>
      ))}
    </ScrollArea>
  ),
} satisfies Meta<typeof ScrollArea>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
