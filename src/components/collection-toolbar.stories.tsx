import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { CollectionToolbar } from './collection-toolbar'
import { Label } from './ui/label'

const meta = {
  title: 'Journal/Collection toolbar',
  component: CollectionToolbar,
  args: {
    value: '',
    placeholder: 'Search brews…',
    ariaLabel: 'Search brews',
    resultLabel: '42 brews',
    onValueChange: fn(),
    debounceMs: 0,
    filterCount: 0,
    onClearFilters: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <CollectionToolbar
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value)
          updateArgs({ value })
        }}
        onClearFilters={() => {
          args.onClearFilters?.()
          updateArgs({ filterCount: 0 })
        }}
        filters={(suffix) => (
          <div className="space-y-2">
            <Label htmlFor={`brew-method${suffix}`}>Brewing method</Label>
            <select
              id={`brew-method${suffix}`}
              className="h-11 w-full rounded-xl border border-input bg-card px-3"
              value={args.filterCount ? 'espresso' : ''}
              onChange={(event) =>
                updateArgs({ filterCount: event.target.value ? 1 : 0 })
              }
            >
              <option value="">All methods</option>
              <option value="espresso">Espresso</option>
            </select>
          </div>
        )}
      />
    )
  },
} satisfies Meta<typeof CollectionToolbar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Filtered: Story = {
  args: { value: 'Guji', resultLabel: '3 brews', filterCount: 1 },
}
export const NoResults: Story = {
  args: { value: 'Decaf', resultLabel: '0 brews' },
}
