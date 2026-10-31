import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { TasteTagSelector } from './taste-tag-selector'

const meta = {
  title: 'Brewing/Taste tags',
  component: TasteTagSelector,
  args: {
    label: 'Flavor notes',
    tags: [
      { id: 1, name: 'Chocolate', hint: 'Cocoa and dark chocolate' },
      { id: 2, name: 'Caramel' },
      { id: 3, name: 'Citrus' },
      { id: 4, name: 'Berry' },
      { id: 5, name: 'Floral' },
      { id: 6, name: 'Hazelnut' },
    ],
    selected: [1],
    onToggle: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <TasteTagSelector
        {...args}
        onToggle={(id) => {
          args.onToggle(id)
          updateArgs({
            selected: args.selected.includes(id)
              ? args.selected.filter((value) => value !== id)
              : [...args.selected, id],
          })
        }}
      />
    )
  },
} satisfies Meta<typeof TasteTagSelector>
export default meta
type Story = StoryObj<typeof meta>
export const AllTags: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Citrus' })
    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
  },
}
export const NoneSelected: Story = { args: { selected: [] } }
export const Featured: Story = {
  args: { featuredIds: [1, 2, 3], selected: [5] },
}
