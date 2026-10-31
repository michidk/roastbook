import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  args: { defaultValue: 'recipe' },
  render: (args) => (
    <Tabs {...args}>
      <TabsList>
        <TabsTrigger value="recipe">Recipe</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="recipe">
        18 g coffee, 36 g yield, 28 seconds.
      </TabsContent>
      <TabsContent value="notes">Chocolate and caramel.</TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('tab', { name: 'Notes' }))
    await expect(
      canvas.getByRole('tabpanel', { name: 'Notes' }),
    ).toHaveTextContent('Chocolate and caramel.')
  },
}
export const Vertical: Story = { args: { orientation: 'vertical' } }
