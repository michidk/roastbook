import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { DEFAULT_TASTE_PROFILE_CONFIG } from '@/lib/taste-profile'
import { TasteScalePicker } from './taste-scale-picker'

const meta = {
  title: 'Settings/Taste scales',
  component: TasteScalePicker,
  args: { config: DEFAULT_TASTE_PROFILE_CONFIG, onToggle: fn() },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <TasteScalePicker
        {...args}
        onToggle={(field, enabled) => {
          args.onToggle(field, enabled)
          updateArgs({ config: { ...args.config, [field]: enabled } })
        }}
      />
    )
  },
} satisfies Meta<typeof TasteScalePicker>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
