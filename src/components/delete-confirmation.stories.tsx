import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { DeleteConfirmation } from './delete-confirmation'

const meta = {
  title: 'Forms/Delete confirmation',
  component: DeleteConfirmation,
  args: {
    title: 'Delete brew?',
    description: 'This permanently removes the brew from your journal.',
    onConfirm: fn(),
  },
} satisfies Meta<typeof DeleteConfirmation>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Delete brew?' }),
    )
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('dialog', {
        name: 'Delete brew?',
      }),
    ).toBeVisible()
  },
}
export const SlowDeletion: Story = {
  args: {
    onConfirm: fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }),
  },
}
export const FailedDeletion: Story = {
  args: {
    onConfirm: fn(async () => {
      throw new Error('The brew could not be deleted. Try again.')
    }),
  },
}
