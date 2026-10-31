import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { SuggestionChips } from './suggestion-chips'

const meta = {
  title: 'Forms/Suggestions',
  component: SuggestionChips,
  args: {
    label: 'Coffee',
    value: '1',
    items: [
      { id: 1, name: 'Ethiopia Guji', description: 'Washed · 180 g remaining' },
      {
        id: 2,
        name: 'Colombia Huila',
        description: 'Natural · 250 g remaining',
      },
      { id: 3, name: 'Brazil Cerrado', description: 'Chocolate and hazelnut' },
    ],
    onChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <SuggestionChips
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof SuggestionChips>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
