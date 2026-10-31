import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bean, Coffee, Search } from 'lucide-react'
import { EmptyState } from './empty-state'

const meta = {
  title: 'Journal/Empty state',
  component: EmptyState,
  args: {
    icon: Coffee,
    title: 'No brews yet',
    description: 'Record your first brew to start your coffee journal.',
    actionLabel: 'Add brew',
    actionHref: '/brews/new',
  },
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>
export const FirstBrew: Story = {}
export const NoBeans: Story = {
  args: {
    icon: Bean,
    title: 'Your shelf is empty',
    description: 'Add a coffee to start tracking your bags.',
    actionLabel: 'Add coffee',
    actionHref: '/beans/new',
  },
}
export const NoResults: Story = {
  args: {
    icon: Search,
    title: 'No matching brews',
    description: 'Try a different search or clear your filters.',
    actionLabel: 'View all brews',
    actionHref: '/brews',
  },
}
