import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, within } from 'storybook/test'
import {
  AltitudeRangeField,
  useAltitudeFormatter,
} from './altitude-range-field'

const meta = {
  title: 'Beans/Altitude range field',
  component: AltitudeRangeField,
  args: {
    id: 'altitude',
    min: '',
    max: '',
    onMinChange: fn(),
    onMaxChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <div className="max-w-md">
        <AltitudeRangeField
          {...args}
          onMinChange={(min) => {
            args.onMinChange(min)
            updateArgs({ min })
          }}
          onMaxChange={(max) => {
            args.onMaxChange(max)
            updateArgs({ max })
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof AltitudeRangeField>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Range: Story = { args: { min: '1800', max: '2100' } }

export const SingleAltitude: Story = { args: { min: '1950' } }

export const Inverted: Story = {
  args: { min: '2100', max: '1800' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText('Highest altitude')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(
      canvas.getByText('The highest altitude is below the lowest.'),
    ).toBeVisible()
  },
}

export const Disabled: Story = {
  args: { min: '1800', max: '2100', disabled: true },
}

export const TypingARange: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Lowest altitude'), '1700')
    await userEvent.type(canvas.getByLabelText('Highest altitude'), '1900')
    await expect(args.onMaxChange).toHaveBeenLastCalledWith('1900')
  },
}

function FormattedAltitudes() {
  const format = useAltitudeFormatter()
  return (
    <dl className="grid max-w-xs grid-cols-2 gap-2 text-sm">
      <dt className="text-muted-foreground">Range</dt>
      <dd className="font-medium">{format(1800, 2100)}</dd>
      <dt className="text-muted-foreground">Single</dt>
      <dd className="font-medium">{format(1950, null)}</dd>
      <dt className="text-muted-foreground">Equal ends</dt>
      <dd className="font-medium">{format(2000, 2000)}</dd>
      <dt className="text-muted-foreground">Unknown</dt>
      <dd className="font-medium">{format(null, null) ?? '-'}</dd>
    </dl>
  )
}

export const DisplayFormat: Story = {
  render: () => <FormattedAltitudes />,
}
