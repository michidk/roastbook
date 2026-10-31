import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrewingAveragesCard } from './stats-brewing-insights'

const meta = {
  title: 'Stats/Brewing averages',
  component: BrewingAveragesCard,
  args: { brewing: { avgDose: 18, avgYield: 36, avgTime: 28, avgRatio: 2 } },
} satisfies Meta<typeof BrewingAveragesCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const PartialMeasurements: Story = {
  args: {
    brewing: { avgDose: 15, avgYield: null, avgTime: 180, avgRatio: null },
  },
}
