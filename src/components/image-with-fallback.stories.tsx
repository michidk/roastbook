import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImageWithFallback } from './image-with-fallback'

const meta = {
  title: 'Journal/Image with fallback',
  component: ImageWithFallback,
  args: {
    src: '/media/storybook/kraft-orange.webp',
    alt: 'Orange coffee packaging',
    width: 400,
    height: 400,
    className: 'aspect-square w-full rounded-2xl object-cover',
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageWithFallback>
export default meta
type Story = StoryObj<typeof meta>
export const Loaded: Story = {}
export const Unavailable: Story = { args: { src: undefined } }
export const Decorative: Story = { args: { src: undefined, alt: '' } }
