import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShotParameterCharts } from './shot-parameter-charts'

const meta = {
  title: 'Brewing/Parameter charts',
  component: ShotParameterCharts,
  args: {
    shots: Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      doseGrams: '18',
      yieldGrams: String(34 + i),
      grindSetting: String(10 + i),
      shotTimeSeconds: String(25 + i),
      brewedAt: `2026-10-${String(i + 1).padStart(2, '0')}T08:00:00Z`,
    })),
  },
} satisfies Meta<typeof ShotParameterCharts>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { shots: [] } }
export const SingleBrew: Story = {
  args: {
    shots: [
      {
        id: 1,
        doseGrams: '18',
        yieldGrams: '36',
        grindSetting: '12',
        shotTimeSeconds: '28',
        brewedAt: '2026-10-01T08:00:00Z',
      },
    ],
  },
}
