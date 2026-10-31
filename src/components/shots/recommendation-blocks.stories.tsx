import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ChangeBlock,
  KeepConstantBlock,
  NoteBlock,
} from './recommendation-blocks'

const meta = {
  title: 'Brewing/Recommendation blocks',
  component: ChangeBlock,
  args: {
    change: {
      parameter: 'grindSetting',
      currentValue: '4.5',
      recommendedValue: '4.0',
      reason:
        'Grind finer while keeping [[doseGrams]] stable to increase extraction.',
    },
  },
} satisfies Meta<typeof ChangeBlock>
export default meta
type Story = StoryObj<typeof meta>
export const Change: Story = {}
export const CompleteRecommendation: Story = {
  render: (args) => (
    <div className="max-w-xl space-y-3">
      <ChangeBlock {...args} />
      <KeepConstantBlock
        item={{
          parameter: 'doseGrams',
          currentValue: '18 g',
          reason:
            'Keep the dose fixed so you can compare the effect of [[grindSetting]].',
        }}
      />
      <NoteBlock text="Taste the next brew before changing [[brewTemperatureCelsius]]." />
    </div>
  ),
}
