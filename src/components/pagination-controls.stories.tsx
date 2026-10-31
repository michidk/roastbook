import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { PaginationControls } from './pagination-controls'

const meta = {
  title: 'Journal/Pagination',
  component: PaginationControls,
  args: { page: 1, totalPages: 20, onPageChange: fn() },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <PaginationControls
        {...args}
        onPageChange={(page) => {
          args.onPageChange(page)
          updateArgs({ page })
        }}
      />
    )
  },
} satisfies Meta<typeof PaginationControls>
export default meta
type Story = StoryObj<typeof meta>
export const FirstPage: Story = {}
export const MiddlePage: Story = { args: { page: 10 } }
export const LastPage: Story = { args: { page: 20 } }
export const SinglePage: Story = { args: { totalPages: 1 } }
