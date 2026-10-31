import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { StarRating } from './star-rating'

const meta = {
  title: 'UI/Star rating',
  component: StarRating,
  args: { value: 3, onChange: fn(), ariaLabel: 'Overall rating' },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <StarRating
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value })
        }}
      />
    )
  },
} satisfies Meta<typeof StarRating>
export default meta
type Story = StoryObj<typeof meta>
export const Editable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Rate 4 out of 5' }),
    )
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Rate 4 out of 5' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Clear rating' }))
    await waitFor(() => expect(canvas.getByText('Not rated')).toBeVisible())
  },
}
export const Unrated: Story = { args: { value: 0 } }
export const ReadOnly: Story = { args: { readOnly: true } }
export const Compact: Story = {
  args: { readOnly: true, variant: 'compact', value: 4 },
}
