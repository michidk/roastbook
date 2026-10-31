import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CollectionResults } from './collection-results'

const meta = {
  title: 'Journal/Collection results',
  component: CollectionResults,
  args: {
    page: 1,
    totalPages: 3,
    totalItems: 42,
    onPageChange: fn(),
    emptyMessage: 'No brews match your filters.',
    children: <p className="py-4">Showing 20 of 42 brews.</p>,
  },
} satisfies Meta<typeof CollectionResults>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { totalItems: 0, totalPages: 0 } }
