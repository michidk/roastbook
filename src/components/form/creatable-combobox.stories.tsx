import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { CreatableCombobox } from './creatable-combobox'

const meta = {
  title: 'Forms/Creatable combobox',
  component: CreatableCombobox<{ id: number; name: string }>,
  args: {
    id: 'coffee-picker',
    label: 'Coffee',
    value: '',
    items: [
      { id: 1, name: 'Ethiopia Guji' },
      { id: 2, name: 'Colombia Huila' },
    ],
    getKey: (item: { id: number; name: string }) => item.id,
    getLabel: (item: { id: number; name: string }) => item.name,
    onChange: fn(),
    onCreateRequest: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <CreatableCombobox
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof CreatableCombobox<{ id: number; name: string }>>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Selected: Story = { args: { value: '1' } }
export const Empty: Story = {
  args: { items: [], emptyStateMessage: 'Add a coffee to start brewing.' },
}
export const Invalid: Story = { args: { error: 'Choose a coffee.' } }
export const Disabled: Story = { args: { disabled: true } }
