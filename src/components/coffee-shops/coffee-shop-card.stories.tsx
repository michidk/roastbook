import type { Meta, StoryObj } from '@storybook/react-vite'
import { CoffeeShopCard } from './coffee-shop-card'

const meta = {
  title: 'Journal/Café card',
  component: CoffeeShopCard,
  args: {
    coffeeShop: {
      id: 1,
      name: 'Corner Coffee',
      address: '12 Market Street',
      city: 'Berlin',
      country: 'Germany',
      website: null,
      updatedAt: '2026-10-01T00:00:00Z',
      latitude: '52.52',
      longitude: '13.405',
      isFavorite: false,
      wantsToVisit: false,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CoffeeShopCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Favorite: Story = {
  args: {
    coffeeShop: { ...meta.args.coffeeShop, isFavorite: true },
    emphasizeFavorite: true,
  },
}
export const WantToVisit: Story = {
  args: { coffeeShop: { ...meta.args.coffeeShop, wantsToVisit: true } },
}
export const MissingLocation: Story = {
  args: {
    coffeeShop: {
      ...meta.args.coffeeShop,
      address: null,
      city: null,
      country: null,
      latitude: null,
      longitude: null,
    },
  },
}
