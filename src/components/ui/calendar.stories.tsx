import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { Calendar } from './calendar'

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
  args: { selected: new Date(2026, 9, 15), onSelect: fn() },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <Calendar
        {...args}
        onSelect={(value) => {
          args.onSelect?.(value)
          updateArgs({ selected: value })
        }}
      />
    )
  },
} satisfies Meta<typeof Calendar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Bounded: Story = {
  args: { minDate: new Date(2026, 9, 10), maxDate: new Date(2026, 9, 20) },
}
