import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { fn } from 'storybook/test'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Save brew', onClick: fn() },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'primary',
        'secondary',
        'outline',
        'ghost',
        'link',
        'destructive',
      ],
    },
    size: {
      control: 'select',
      options: [
        'default',
        'xs',
        'sm',
        'lg',
        'icon',
        'icon-xs',
        'icon-sm',
        'icon-lg',
      ],
    },
  },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
export const Primary: Story = {}
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {(
        [
          'default',
          'secondary',
          'outline',
          'ghost',
          'link',
          'destructive',
        ] as const
      ).map((variant) => (
        <Button {...args} key={variant} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {(['xs', 'sm', 'default', 'lg'] as const).map((size) => (
        <Button {...args} key={size} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
}
export const Disabled: Story = { args: { disabled: true } }
export const IconOnly: Story = {
  args: {
    children: <Plus aria-hidden />,
    size: 'icon',
    'aria-label': 'Add brew',
  },
}
