import type { Meta, StoryObj } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import { RoasterFields } from './roaster-fields'
import { createRoasterFormValues } from './roaster-form-values'

const meta = {
  title: 'Forms/Roaster fields',
  component: RoasterFields,
  args: { values: createRoasterFormValues(), onChange: fn() },
  argTypes: { values: { control: false } },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <div className="max-w-4xl space-y-6">
        <RoasterFields
          {...args}
          onChange={(key, value) => {
            args.onChange(key, value)
            updateArgs({ values: { ...args.values, [key]: value } })
          }}
        />
      </div>
    )
  },
} satisfies Meta<typeof RoasterFields>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
