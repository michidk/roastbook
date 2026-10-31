import type { Meta, StoryObj } from '@storybook/react-vite'
import { CollectionList } from './collection-list'

const meta = {
  title: 'Journal/Collection list',
  component: CollectionList<{ id: number; name: string; origin: string }>,
  args: {
    view: 'cards',
    items: [
      { id: 1, name: 'Ethiopia Guji', origin: 'Ethiopia' },
      { id: 2, name: 'Colombia Huila', origin: 'Colombia' },
    ],
    getEntry: (item: { id: number; name: string; origin: string }) => ({
      id: item.id,
      title: item.name,
      subtitle: item.origin,
      to: '/beans',
      media: { kind: 'none' },
    }),
    columns: [
      {
        key: 'origin',
        header: 'Origin',
        cell: (item: { origin: string }) => item.origin,
      },
    ],
  },
} satisfies Meta<
  typeof CollectionList<{ id: number; name: string; origin: string }>
>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const TableView: Story = { args: { view: 'table' } }
