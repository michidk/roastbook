import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { DateField } from './date-field'

const meta = {
  title: 'Forms/Date field',
  component: DateField,
  args: {
    id: 'roast-date',
    label: 'Roast date',
    value: '2026-10-15',
    onChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <DateField
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof DateField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { value: '' } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { error: 'Choose a roast date.' } }
