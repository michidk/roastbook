import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { useArgs } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import {
  CurrencyInputField,
  InputField,
  SelectField,
  TextareaField,
} from './form-field'

function SelectFieldDemo() {
  const [value, setValue] = useState('washed')
  return (
    <SelectField
      id="process"
      label="Process"
      value={value}
      onChange={setValue}
      options={[
        { value: 'washed', label: 'Washed' },
        { value: 'natural', label: 'Natural' },
      ]}
    />
  )
}
const meta = {
  title: 'Forms/Fields',
  component: InputField,
  args: {
    id: 'coffee',
    label: 'Coffee name',
    value: '',
    placeholder: 'Ethiopia Guji',
    onChange: fn(),
  },
  render: function Interactive(args) {
    const [, updateArgs] = useArgs<typeof args>()
    return (
      <InputField
        {...args}
        onChange={(value) => {
          args.onChange?.(value)
          updateArgs({ value: value })
        }}
      />
    )
  },
} satisfies Meta<typeof InputField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Required: Story = { args: { required: true } }
export const Invalid: Story = { args: { error: 'Enter a coffee name.' } }
export const Disabled: Story = { args: { disabled: true } }
export const Measurement: Story = {
  args: { label: 'Dose', type: 'number', value: '18', unit: 'g', step: 0.1 },
}
export const Notes: Story = {
  render: () => (
    <TextareaField
      id="notes"
      label="Tasting notes"
      value="Chocolate and caramel"
      onChange={fn()}
    />
  ),
}
export const Selection: Story = { render: () => <SelectFieldDemo /> }
export const Price: Story = {
  render: () => (
    <CurrencyInputField
      id="price"
      label="Price"
      currency="EUR"
      value="16.50"
      onChange={fn()}
    />
  ),
}
