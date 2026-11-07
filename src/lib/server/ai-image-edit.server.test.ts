import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { IMAGE_EDIT_MODEL } from '@/lib/image-edit-accounting'
import {
  BEAUTIFY_IMAGE_PROMPT,
  editImageWithProvider,
} from './ai-image-edit.server'
import type { AiProviderConfig } from './ai-runtime.server'

const image = await sharp({
  create: { width: 16, height: 16, channels: 3, background: '#bb9977' },
})
  .webp()
  .toBuffer()
const usage = {
  input_tokens: 100,
  output_tokens: 30,
  total_tokens: 130,
  input_tokens_details: { image_tokens: 80, text_tokens: 20 },
}
function config(
  send: (request: Request) => Promise<Response>,
): AiProviderConfig {
  return {
    baseURL: 'https://api.openai.com/v1',
    api: 'responses',
    apiKey: 'fixture-secret',
    providerMode: 'byo',
    visionModel: 'vision',
    researchModel: 'research',
    fetch: Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) =>
        send(new Request(input, init)),
      { preconnect: () => {} },
    ),
  }
}
test('sends a fixed prompt and multipart image to the edit endpoint', async () => {
  const result = await editImageWithProvider(
    image,
    'image/webp',
    config(async (request) => {
      expect(request.url).toBe('https://api.openai.com/v1/images/edits')
      expect(request.headers.get('authorization')).toBe('Bearer fixture-secret')
      const form = await request.formData()
      expect(form.get('model')).toBe(IMAGE_EDIT_MODEL)
      expect(form.get('prompt')).toBe(BEAUTIFY_IMAGE_PROMPT)
      expect(form.get('output_format')).toBe('webp')
      expect(form.get('quality')).toBe('medium')
      expect(form.get('n')).toBe('1')
      const file = form.get('image')
      expect(file).toBeInstanceOf(File)
      if (!(file instanceof File)) throw new Error('No image')
      expect(Buffer.from(await file.arrayBuffer())).toEqual(image)
      return Response.json({
        data: [{ b64_json: image.toString('base64') }],
        usage,
      })
    }),
  )
  expect(result.accounting.usage).toEqual(usage)
  expect(result.accounting.totalCost).toBeCloseTo(0.0017)
})
test('does not contact a provider without a key or with invalid input', async () => {
  let calls = 0
  const provider = config(async () => {
    calls++
    return Response.json({})
  })
  await expect(
    editImageWithProvider(image, 'image/webp', {
      ...provider,
      api: 'responses',
      apiKey: undefined,
    }),
  ).rejects.toThrow('Connect')
  await expect(
    editImageWithProvider(new Uint8Array([1, 2]), 'image/webp', provider),
  ).rejects.toThrow()
  expect(calls).toBe(0)
})
test('does not leak the provider response on failure', async () => {
  await expect(
    editImageWithProvider(
      image,
      'image/webp',
      config(
        async () =>
          new Response('secret reflected by provider', { status: 429 }),
      ),
    ),
  ).rejects.toThrow('could not complete')
})
test('retains usage even when the provider returns an invalid picture', async () => {
  const result = await editImageWithProvider(
    image,
    'image/webp',
    config(async () => Response.json({ usage, data: [] })),
  )
  expect(result.accounting.usage).toEqual(usage)
})

test('a configured image model replaces the default and is never priced', async () => {
  const result = await editImageWithProvider(image, 'image/webp', {
    ...config(async (request) => {
      expect((await request.formData()).get('model')).toBe('other-image-model')
      return Response.json({
        data: [{ b64_json: image.toString('base64') }],
        usage,
      })
    }),
    imageModel: 'other-image-model',
  })
  expect(result.accounting.model).toBe('other-image-model')
  expect(result.accounting.totalCost).toBeNull()
})
