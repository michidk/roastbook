import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ShotTimer, useShotTimer } from './shot-timer'

function BrewTimer({
  initialValue,
  targetSeconds,
}: {
  initialValue: string
  targetSeconds: number | null
}) {
  const [value, setValue] = useState(initialValue)
  const timer = useShotTimer({ value, targetSeconds, onCommit: setValue })
  return <ShotTimer timer={timer} />
}
const meta = {
  title: 'Brewing/Timer',
  component: BrewTimer,
  args: { initialValue: '', targetSeconds: 30 },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BrewTimer>
export default meta
type Story = StoryObj<typeof meta>
export const Ready: Story = {}
export const Recorded: Story = { args: { initialValue: '28.5' } }
export const OverTarget: Story = { args: { initialValue: '35' } }
export const WithoutTarget: Story = { args: { targetSeconds: null } }
