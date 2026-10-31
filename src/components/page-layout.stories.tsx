import type { Meta, StoryObj } from '@storybook/react-vite'
import { Page, PageHeader } from './page-layout'
import { Button } from './ui/button'

const meta = {
  title: 'Journal/Page layout',
  component: PageHeader,
  args: {
    title: 'Your coffee shelf',
    description: 'Track the coffees you are brewing.',
    actions: <Button>Add coffee</Button>,
  },
  render: (args) => (
    <Page width="wide">
      <PageHeader {...args} />
    </Page>
  ),
} satisfies Meta<typeof PageHeader>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Compact: Story = { args: { size: 'compact' } }
export const WithHelp: Story = {
  args: {
    help: 'Each coffee can have multiple bags. Archive a bag when it is finished.',
  },
}
