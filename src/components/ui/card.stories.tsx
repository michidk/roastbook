import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'
import { Skeleton } from './skeleton'

const meta = {
  title: 'UI/Card',
  component: Card,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Morning espresso</CardTitle>
        <CardDescription>Ethiopia Guji · Washed</CardDescription>
      </CardHeader>
      <CardContent>
        <p>18 g in · 36 g out · 28 seconds</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Edit brew</Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Compact: Story = { args: { size: 'sm' } }
export const Loading: Story = {
  render: () => (
    <Card aria-label="Loading brew" aria-busy="true">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  ),
}
