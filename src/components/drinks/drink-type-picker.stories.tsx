import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { DrinkTypePicker } from './drink-type-picker'

const meta = {
  title: 'Brewing/Drink type picker',
  component: DrinkTypePicker,
  args: {
    id: 'drink-type',
    drinkTypes: [
      { id: 1, name: 'Espresso', optionGroupIds: [] },
      { id: 2, name: 'Cappuccino', optionGroupIds: [] },
    ],
    value: '',
    onChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <DrinkTypePicker
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof DrinkTypePicker>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Selected: Story = { args: { value: '1' } }
