import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { NumberInput } from './number-input'
import { Label } from './ui/label'

const meta = {
  title: 'Forms/Number input',
  component: NumberInput,
  args: {
    id: 'dose',
    value: '18',
    min: 0,
    max: 30,
    step: 0.1,
    unit: 'g',
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm space-y-2">
        <Label htmlFor="dose">Dose</Label>
        <Story />
      </div>
    ),
  ],
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <NumberInput
        {...args}
        onChange={(value) => {
          args.onChange(value)
          updateArgs({ value })
        }}
      />
    )
  },
} satisfies Meta<typeof NumberInput>
export default meta
type Story = StoryObj<typeof meta>
export const Dose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Increase by 0.1' }),
    )
    await waitFor(() =>
      expect(canvas.getByRole('spinbutton', { name: 'Dose' })).toHaveValue(
        '18.1',
      ),
    )
  },
}
export const DecimalComma: Story = {
  parameters: { appSettings: { numberFormat: 'decimal-comma' } },
  args: { value: '18.5' },
}
export const AtMinimum: Story = { args: { value: '0' } }
export const AtMaximum: Story = { args: { value: '30' } }
export const Disabled: Story = { args: { disabled: true } }
