import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { GearFields } from './gear-fields'
import { createEmptyGearFormValues } from './gear-form-values'

const meta = {
  title: 'Forms/Gear fields',
  component: GearFields,
  args: {
    values: createEmptyGearFormValues(),
    onChange: fn(),
    research: { enabled: false, isResearching: false, onResearch: fn() },
  },
  argTypes: { values: { control: false } },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <div className="max-w-4xl space-y-6">
        <GearFields
          {...args}
          onChange={(key, value) => {
            args.onChange(key, value)
            updateArgs({ values: { ...args.values, [key]: value } })
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof GearFields>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Grinder: Story = {
  args: {
    values: {
      ...createEmptyGearFormValues(),
      type: 'grinder',
      brand: 'Example',
      model: 'Burr grinder',
    },
  },
}
export const EspressoMachine: Story = {
  args: {
    values: {
      ...createEmptyGearFormValues(),
      type: 'espresso_machine',
      brand: 'Example',
      model: 'Dual boiler',
    },
  },
}
