import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Checkbox } from './checkbox'

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: {
    checked: false,
    onCheckedChange: fn(),
    'aria-label': 'Mark as favorite',
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <Checkbox
        {...args}
        onCheckedChange={(value, details) => {
          args.onCheckedChange?.(value, details)
          updateArgs({ checked: value })
        }}
      />
    )
  },
} satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const control = await within(canvasElement).findByRole('checkbox', {
      name: 'Mark as favorite',
    })
    await userEvent.click(control)
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole('checkbox', {
          name: 'Mark as favorite',
        }),
      ).toHaveAttribute('aria-checked', 'true'),
    )
  },
}
export const Checked: Story = { args: { checked: true } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
