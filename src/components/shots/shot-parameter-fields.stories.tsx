import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { EMPTY_SHOT_FORM_VALUES } from '@/modules/brews/shot-form-values'
import { ShotParameterFields } from './shot-parameter-fields'

const meta = {
  title: 'Brewing/Parameter fields',
  component: ShotParameterFields,
  args: {
    values: {
      ...EMPTY_SHOT_FORM_VALUES,
      doseGrams: '18',
      yieldGrams: '36',
      shotTimeSeconds: '28',
    },
    gear: [],
    enabledParameters: [
      'machineId',
      'grinderId',
      'doseGrams',
      'yieldGrams',
      'grindSetting',
      'shotTimeSeconds',
      'brewTemperatureCelsius',
      'usesPuckScreen',
      'distributionMethod',
    ],
    onChange: fn(),
  },
  argTypes: { values: { control: false }, gear: { control: false } },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <div className="max-w-4xl space-y-6">
        <ShotParameterFields
          {...args}
          onChange={(key, value) => {
            args.onChange(key, value)
            updateArgs({ values: { ...args.values, [key]: value } })
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof ShotParameterFields>
export default meta
type Story = StoryObj<typeof meta>
export const Espresso: Story = {}
export const Filter: Story = {
  args: {
    values: {
      ...EMPTY_SHOT_FORM_VALUES,
      doseGrams: '15',
      brewWaterGrams: '250',
      bloomTimeSeconds: '30',
    },
    enabledParameters: [
      'doseGrams',
      'brewWaterGrams',
      'grindSetting',
      'targetTimeSeconds',
      'bloomTimeSeconds',
      'brewTemperatureCelsius',
    ],
  },
}
export const Invalid: Story = {
  args: {
    errors: {
      doseGrams: 'Enter a dose greater than zero.',
      yieldGrams: 'Enter the measured yield.',
    },
  },
}
