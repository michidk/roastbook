import type { Meta, StoryObj } from '@storybook/react-vite'
import { usePreferencesStore } from '@/lib/preferences-store'
import { AccountMenu } from './account-menu'

const meta = {
  title: 'Navigation/Account menu',
  component: AccountMenu,
  args: { account: null, demoMode: false },
  decorators: [
    (Story) => (
      <div className="flex min-h-80 w-full justify-end">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    const { theme, hasHydrated } = usePreferencesStore.getState()
    usePreferencesStore.setState({ theme: 'system', hasHydrated: true })
    return () => usePreferencesStore.setState({ theme, hasHydrated })
  },
} satisfies Meta<typeof AccountMenu>
export default meta

type Story = StoryObj<typeof meta>
export const DefaultUser: Story = {}
export const DemoUser: Story = { args: { demoMode: true } }
export const SignedIn: Story = {
  args: {
    account: { id: 'example-user', email: 'user@example.test', role: 'user' },
  },
}
export const Administrator: Story = {
  args: {
    account: {
      id: 'example-admin',
      email: 'admin@example.test',
      role: 'admin',
    },
  },
}
