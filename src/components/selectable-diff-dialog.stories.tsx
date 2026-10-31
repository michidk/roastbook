import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SelectableDiffDialog } from './selectable-diff-dialog'
import { Button } from './ui/button'

const meta = {
  title: 'Forms/Suggested changes',
  component: SelectableDiffDialog,
  args: {
    open: false,
    onOpenChange: fn(),
    title: 'Review coffee details',
    emptyDescription: 'The coffee details are already up to date.',
    diffs: [
      {
        key: 'origin',
        label: 'Origin',
        currentValue: '',
        suggestedValue: 'Ethiopia',
        hasConflict: false,
      },
      {
        key: 'process',
        label: 'Process',
        currentValue: 'Natural',
        suggestedValue: 'Washed',
        hasConflict: true,
      },
    ],
    onApply: fn(),
  },
  render: function Review(args) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Review suggestions</Button>
        <SelectableDiffDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    )
  },
} satisfies Meta<typeof SelectableDiffDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { diffs: [] } }
