import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DARK_THEMES, LIGHT_THEMES } from '@/lib/theme'
import { ThemePalettePicker } from './theme-palette-picker'

const meta = {
  title: 'Settings/Theme palettes',
  component: ThemePalettePicker,
  args: {
    mode: 'light',
    options: LIGHT_THEMES,
    value: 'light-roast',
    disabled: false,
    onChange: () => {},
  },
  render: (args) => <InteractivePicker {...args} />,
} satisfies Meta<typeof ThemePalettePicker>
export default meta
type Story = StoryObj<typeof meta>

function InteractivePicker(
  props: React.ComponentProps<typeof ThemePalettePicker>,
) {
  const [value, setValue] = useState(props.value)
  return <ThemePalettePicker {...props} value={value} onChange={setValue} />
}

export const Light: Story = {}
export const Dark: Story = {
  args: { mode: 'dark', options: DARK_THEMES, value: 'dark-roast' },
}
