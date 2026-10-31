import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Button } from './button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  args: {},
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button />}>Edit brew</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit brew</DialogTitle>
          <DialogDescription>
            Review the recorded brew before saving.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p>18 g in · 36 g out · 28 seconds</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose render={<Button />}>Save brew</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}

export const OpenAndClose: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: 'Edit brew' }),
    )
    await expect(
      await body.findByRole('dialog', { name: 'Edit brew' }),
    ).toBeVisible()
    await userEvent.click(body.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  },
}
