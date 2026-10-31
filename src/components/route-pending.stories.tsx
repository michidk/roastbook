import type { Meta, StoryObj } from '@storybook/react-vite'
import { DetailPending, ListPending, RoutePending } from './route-pending'

const meta = {
  title: 'Journal/Loading states',
  component: RoutePending,
  args: {},
} satisfies Meta<typeof RoutePending>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Collection: Story = { render: () => <ListPending /> }
export const Detail: Story = { render: () => <DetailPending /> }
