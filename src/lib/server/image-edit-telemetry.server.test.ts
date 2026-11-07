import { expect, test } from 'bun:test'
import { imageEditAccounting } from '@/lib/image-edit-accounting'
import { imageEditEvent } from './image-edit-telemetry.server'

test('reports explicit PostHog costs without image content or credentials', () => {
  const accounting = imageEditAccounting(
    {
      input_tokens: 100,
      output_tokens: 10,
      total_tokens: 110,
      input_tokens_details: { text_tokens: 20, image_tokens: 80 },
    },
    'https://api.openai.com/v1',
  )
  const event = imageEditEvent({
    logId: 12,
    accounting,
    durationMs: 1234,
    failed: false,
  })
  expect(event.event).toBe('$ai_generation')
  expect(event.properties.$ai_total_cost).toBe(0.00106)
  expect(event.properties.$ai_latency).toBe(1.234)
  expect(JSON.stringify(event)).not.toContain('base64')
  expect(JSON.stringify(event)).not.toContain('prompt')
})
test('omits unknown usage and costs instead of reporting zero', () => {
  const event = imageEditEvent({
    logId: 13,
    accounting: imageEditAccounting(null, 'https://other.example/v1'),
    durationMs: 2,
    failed: true,
  })
  expect(event.properties).not.toHaveProperty('$ai_total_cost')
  expect(event.properties).not.toHaveProperty('$ai_input_tokens')
  expect(event.properties.$ai_is_error).toBe(true)
})
