import { Switch } from '@roastbook/ui/switch'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

const meta = {
  title: 'UI/Switch',
  component: Switch,
  args: {
    checked: false,
    onCheckedChange: fn(),
    'aria-label': 'Enable timer sounds',
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <Switch
        {...args}
        onCheckedChange={(value, details) => {
          args.onCheckedChange?.(value, details)
          updateArgs({ checked: value })
        }}
      />
    )
  },
} satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const control = await within(canvasElement).findByRole('switch', {
      name: 'Enable timer sounds',
    })
    await userEvent.click(control)
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole('switch', {
          name: 'Enable timer sounds',
        }),
      ).toHaveAttribute('aria-checked', 'true'),
    )
  },
}
export const Enabled: Story = { args: { checked: true } }
export const Disabled: Story = { args: { disabled: true } }
export const Small: Story = { args: { size: 'sm' } }

export const SmallEnabled: Story = { args: { size: 'sm', checked: true } }
export const DisabledEnabled: Story = {
  args: { disabled: true, checked: true },
}
