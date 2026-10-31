import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Toggle } from './toggle'

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  args: { pressed: false, onPressedChange: fn(), children: 'Puck screen' },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <Toggle
        {...args}
        onPressedChange={(value, details) => {
          args.onPressedChange?.(value, details)
          updateArgs({ pressed: value })
        }}
      />
    )
  },
} satisfies Meta<typeof Toggle>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const control = await within(canvasElement).findByRole('button', {
      name: 'Puck screen',
    })
    await userEvent.click(control)
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole('button', { name: 'Puck screen' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
  },
}
export const Pressed: Story = { args: { pressed: true } }
export const Outline: Story = { args: { variant: 'outline' } }
export const Disabled: Story = { args: { disabled: true } }
