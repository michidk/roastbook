import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FormActions, FormErrorSummary, FormSection } from './form-shell'

const meta = {
  title: 'Forms/Form structure',
  component: FormSection,
  args: {
    title: 'Extraction',
    description: 'Record the key measurements.',
    children: <p>18 g coffee · 36 g yield · 28 seconds</p>,
  },
} satisfies Meta<typeof FormSection>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Collapsible: Story = {
  args: { collapsible: true, defaultOpen: false },
}
export const Actions: Story = { render: () => <FormActions onCancel={fn()} /> }
export const Saving: Story = {
  render: () => <FormActions onCancel={fn()} isSubmitting />,
}
export const Errors: Story = {
  render: () => (
    <FormErrorSummary
      errors={{
        name: 'Enter a name.',
        dose: 'Dose must be greater than zero.',
      }}
    />
  ),
}
