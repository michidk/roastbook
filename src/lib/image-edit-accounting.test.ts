import { expect, test } from 'bun:test'
import { imageEditAccounting } from './image-edit-accounting'

const usage = {
  input_tokens: 1100,
  output_tokens: 500,
  total_tokens: 1600,
  input_tokens_details: { text_tokens: 100, image_tokens: 1000 },
}
const endpoint = 'https://api.openai.com/v1'
test('prices image input and output separately from text', () => {
  const cost = imageEditAccounting(usage, endpoint)
  expect(cost.inputCost).toBeCloseTo(0.0085)
  expect(cost.outputCost).toBeCloseTo(0.016)
  expect(cost.totalCost).toBeCloseTo(0.0245)
})
test('subtracts cached tokens before charging uncached rates', () => {
  const cost = imageEditAccounting(
    {
      ...usage,
      input_tokens_details: {
        ...usage.input_tokens_details,
        cached_tokens: 550,
        cached_tokens_details: { text_tokens: 50, image_tokens: 500 },
      },
    },
    endpoint,
  )
  expect(cost.inputCost).toBeCloseTo(0.0053125)
})
test('unknown or inconsistent usage and custom provider prices remain unknown', () => {
  for (const value of [
    undefined,
    {},
    { ...usage, total_tokens: 3 },
    {
      ...usage,
      input_tokens_details: {
        ...usage.input_tokens_details,
        cached_tokens: 100,
      },
    },
  ])
    expect(imageEditAccounting(value, endpoint).totalCost).toBeNull()
  expect(
    imageEditAccounting(usage, 'https://proxy.example/v1').totalCost,
  ).toBeNull()
})
