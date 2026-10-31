import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageHelp } from './page-help'

const meta = {
  title: 'Journal/Page help',
  component: PageHelp,
  args: {
    children:
      'Track each coffee as a profile, then add another bag for repeat purchases.',
  },
} satisfies Meta<typeof PageHelp>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
