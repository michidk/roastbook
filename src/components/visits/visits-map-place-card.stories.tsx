import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VisitsMapPlaceCard } from './visits-map-place-card'

const place = {
  id: 'saved:1',
  coffeeShopId: 1,
  name: 'Sunday Coffee',
  address: '12 Market Street',
  city: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.4,
  website: null,
  updatedAt: '2026-10-31',
  rating: 4,
  isFavorite: false,
  wantsToVisit: false,
  visitCount: 3,
}
const meta = {
  title: 'Maps/Place card',
  component: VisitsMapPlaceCard,
  args: { place, focusRequest: 0, onClose: fn() },
  argTypes: { place: { control: false } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[22rem] [&>article]:static [&>article]:m-0 [&>article]:w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VisitsMapPlaceCard>
export default meta
type Story = StoryObj<typeof meta>
export const Saved: Story = {}
export const Favorite: Story = {
  args: { place: { ...place, isFavorite: true } },
}
export const WantToVisit: Story = {
  args: {
    place: { ...place, wantsToVisit: true, rating: null, visitCount: 0 },
  },
}
