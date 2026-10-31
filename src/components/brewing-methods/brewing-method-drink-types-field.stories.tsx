import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { BrewingMethodDrinkTypesField } from './brewing-method-drink-types-field'

const meta = {
  title: 'Brewing/Method drink types',
  component: BrewingMethodDrinkTypesField,
  args: {
    drinkTypes: [
      { id: 1, name: 'Espresso', optionGroupIds: [] },
      { id: 2, name: 'Cappuccino', optionGroupIds: [] },
      { id: 3, name: 'Filter coffee', optionGroupIds: [] },
    ],
    value: [1],
    onChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <BrewingMethodDrinkTypesField
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof BrewingMethodDrinkTypesField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { drinkTypes: [] } }
