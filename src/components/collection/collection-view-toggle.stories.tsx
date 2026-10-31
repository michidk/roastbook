import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { CollectionViewToggle } from './collection-view-toggle'

const meta = {
  title: 'Journal/Collection view toggle',
  component: CollectionViewToggle,
  args: { value: 'cards', onValueChange: fn() },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <CollectionViewToggle
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof CollectionViewToggle>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const TableView: Story = { args: { value: 'table' } }
export const Disabled: Story = { args: { disabled: true } }
