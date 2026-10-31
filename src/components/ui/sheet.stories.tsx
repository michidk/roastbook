import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  args: {},
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>
        Open filters
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filter brews</SheetTitle>
          <SheetDescription>
            Narrow the journal by brewing method.
          </SheetDescription>
        </SheetHeader>
        <p className="px-4">Espresso · Filter · Immersion</p>
        <SheetFooter>
          <SheetClose render={<Button />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<typeof Sheet>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
