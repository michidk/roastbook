import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { TastingFields } from './tasting-fields'

const meta = {
  title: 'Forms/Tasting fields',
  component: TastingFields,
  render: function Interactive(args) {
    const [rating, setRating] = useState(4)
    const [notes, setNotes] = useState('Sweet citrus with a chocolate finish.')
    const [tags, setTags] = useState<readonly number[]>([1])
    const [balance, setBalance] = useState(0)
    return (
      <div className="max-w-2xl">
        <TastingFields
          {...args}
          rating={{ value: rating, onChange: setRating }}
          notes={{ value: notes, onChange: setNotes }}
          tags={{
            options: [
              { id: 1, name: 'Citrus' },
              { id: 2, name: 'Chocolate' },
              { id: 3, name: 'Floral' },
            ],
            selectedIds: tags,
            onToggle: (id) =>
              setTags(
                tags.includes(id)
                  ? tags.filter((tag) => tag !== id)
                  : [...tags, id],
              ),
          }}
          balance={
            args.kind === 'shot'
              ? { value: balance, onChange: setBalance }
              : undefined
          }
        />
      </div>
    )
  },
  args: {
    kind: 'shot',
    rating: { value: 4, onChange: fn() },
    notes: { value: '', onChange: fn() },
    tags: { options: [], selectedIds: [], onToggle: fn() },
  },
  argTypes: {
    rating: { control: false },
    notes: { control: false },
    tags: { control: false },
    balance: { control: false },
    sensory: { control: false },
  },
} satisfies Meta<typeof TastingFields>
export default meta
type Story = StoryObj<typeof meta>
export const Brew: Story = {}
export const Visit: Story = { args: { kind: 'visit' } }
