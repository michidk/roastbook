import type { Meta, StoryObj } from '@storybook/react-vite'
import { BeanCard } from './bean-card'

const meta = {
  title: 'Journal/Bean card',
  component: BeanCard,
  args: {
    compact: true,
    bean: {
      id: 1,
      name: 'Ethiopia Guji',
      type: 'filter',
      isDecaf: false,
      roaster: 'Paper Cup Roasters',
      roasterId: null,
      roasterRef: null,
      origin: 'Ethiopia',
      region: 'Guji',
      farm: null,
      variety: 'Heirloom',
      process: 'washed',
      roastLevel: 'light',
      notes: 'Jasmine, bergamot, peach',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
      purchaseId: 1,
      roastDate: new Date('2026-10-01T00:00:00Z'),
      weight: '250',
      price: '16.5',
      priceCurrency: 'EUR',
      shopName: null,
      shopUrl: null,
      isArchived: false,
      images: [
        {
          id: 1,
          beanId: 1,
          beanPurchaseId: 1,
          storagePath: 'storybook/kraft-orange.webp',
          isThumbnail: true,
          originalFilename: 'kraft-orange.webp',
          mimeType: 'image/webp',
          sizeBytes: 1000,
          createdAt: new Date('2026-10-01T00:00:00Z'),
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BeanCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const SelectedForBrew: Story = { args: { compact: false } }
export const RemainingWeight: Story = {
  args: {
    showRemainingEstimate: true,
    bean: { ...meta.args.bean, usedWeightGrams: '180' },
  },
}
export const WithoutImage: Story = {
  args: { bean: { ...meta.args.bean, images: [] } },
}
export const LongName: Story = {
  args: {
    bean: {
      ...meta.args.bean,
      name: 'Colombia Huila Finca El Paraiso Double Anaerobic Pink Bourbon',
      isDecaf: true,
    },
  },
}
