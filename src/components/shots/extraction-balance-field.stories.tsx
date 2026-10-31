import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { ExtractionBalanceField } from './extraction-balance-field'

const meta = {
  title: 'Brewing/Extraction balance',
  component: ExtractionBalanceField,
  args: { value: 3, onChange: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <ExtractionBalanceField
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value })
        }}
      />
    )
  },
} satisfies Meta<typeof ExtractionBalanceField>
export default meta
type Story = StoryObj<typeof meta>
export const Balanced: Story = {}
export const Unrecorded: Story = { args: { value: 0 } }
export const Sour: Story = { args: { value: 1 } }
export const Bitter: Story = { args: { value: 5 } }
export const ReadOnly: Story = { args: { readOnly: true } }
