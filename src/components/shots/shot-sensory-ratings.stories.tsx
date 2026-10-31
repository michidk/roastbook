import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { ShotSensoryRatingFields } from './shot-sensory-ratings'

const meta = {
  title: 'Brewing/Sensory ratings',
  component: ShotSensoryRatingFields,
  args: {
    values: {
      bitterness: 2,
      acidity: 4,
      sweetness: 3,
      body: 4,
      astringency: 1,
    },
    onChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <ShotSensoryRatingFields
        {...args}
        onChange={(key, value) => {
          args.onChange?.(key, value)
          updateArgs({ values: { ...args.values, [key]: value } })
        }}
      />
    )
  },
} satisfies Meta<typeof ShotSensoryRatingFields>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {}
export const Unrated: Story = {
  args: {
    values: {
      bitterness: 0,
      acidity: 0,
      sweetness: 0,
      body: 0,
      astringency: 0,
    },
  },
}
export const ReadOnly: Story = { args: { readOnly: true } }
export const PartiallyRated: Story = {
  args: {
    readOnly: true,
    values: {
      bitterness: 2,
      acidity: 4,
      sweetness: 0,
      body: 0,
      astringency: 0,
    },
  },
}
