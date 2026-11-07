import '@tanstack/react-start/server-only'
import { z } from 'zod'
import * as recorder from '@/extension-points/ai-request-recorder.server'
import {
  IMAGE_EDIT_MODEL,
  imageEditAccounting,
} from '@/lib/image-edit-accounting'
import { prepareAiImages } from '@/lib/server/ai-images.server'
import { updateAiAccounting } from '@/lib/server/ai-request-accounting.server'
import {
  type AiProviderConfig,
  getAiProviderConfig,
} from '@/lib/server/ai-runtime.server'
import { reportImageEdit } from '@/lib/server/image-edit-telemetry.server'

export const BEAUTIFY_IMAGE_PROMPT =
  'Retouch this photograph into a beautiful, realistic product photograph of the exact same coffee packaging or object. Preserve its shape, colors, branding, logos, typography, and all readable label text exactly. Do not invent, remove, translate, or change product details. Reduce compression artifacts and sensor noise. Correct white balance and use soft, even natural lighting with realistic shadows. Remove distracting background clutter and replace the background with a tasteful, softly blurred warm neutral cafe setting. Keep the entire product clearly visible, sharp and naturally grounded. Return only the edited photograph.'

const imageResponse = z.object({
  data: z
    .array(
      z.object({
        b64_json: z
          .string()
          .min(1)
          .max(24 * 1024 * 1024),
      }),
    )
    .length(1),
  usage: z.unknown().optional(),
})

export async function editImageWithProvider(
  bytes: Uint8Array,
  mimeType: string,
  config: AiProviderConfig,
) {
  if (!config.apiKey)
    throw new Error('Connect your AI provider in Settings > AI')
  const [image] = await prepareAiImages([
    { imageBase64: Buffer.from(bytes).toString('base64'), mimeType },
  ])
  if (!image) throw new Error('Choose a picture to beautify')
  const form = new FormData()
  form.set('model', config.imageModel ?? IMAGE_EDIT_MODEL)
  form.set('prompt', BEAUTIFY_IMAGE_PROMPT)
  form.set(
    'image',
    new File([new Uint8Array(image.bytes)], 'product.jpg', {
      type: image.mimeType,
    }),
  )
  form.set('n', '1')
  form.set('size', '1024x1024')
  form.set('quality', 'medium')
  form.set('output_format', 'webp')
  const response = await config.fetch(
    `${config.baseURL.replace(/\/$/, '')}/images/edits`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    },
  )
  if (!response.ok)
    throw new Error('The image provider could not complete this edit')
  const raw: unknown = await response.json()
  const envelope = z.object({ usage: z.unknown().optional() }).parse(raw)
  const accounting = imageEditAccounting(
    envelope.usage,
    config.baseURL,
    config.imageModel,
  )
  // Preserve billable usage even if the returned image is invalid.
  return { raw, accounting }
}

export async function beautifyImageBytes(bytes: Uint8Array, mimeType: string) {
  const config: AiProviderConfig = await getAiProviderConfig()
  if (!config.apiKey)
    throw new Error('Connect your AI provider in Settings > AI')
  const model = config.imageModel ?? IMAGE_EDIT_MODEL
  const logId = await recorder.startAiRequestLog({
    providerMode: config.providerMode,
    model,
    requestType: 'image-beautification',
    requestPayload: { imageCount: 1, quality: 'medium', size: '1024x1024' },
  })
  const startedAt = Date.now()
  let accounting = imageEditAccounting(undefined, config.baseURL, model)
  try {
    const result = await editImageWithProvider(bytes, mimeType, config)
    accounting = result.accounting
    const response = imageResponse.parse(result.raw)
    const encoded = response.data[0]?.b64_json
    if (!encoded) throw new Error('The image provider returned no picture')
    const decoded = Buffer.from(encoded, 'base64')
    if (decoded.toString('base64') !== encoded)
      throw new Error('The image provider returned invalid image data')
    const [image] = await prepareAiImages([
      { imageBase64: encoded, mimeType: 'image/webp' },
    ])
    if (!image) throw new Error('The image provider returned no picture')
    await recorder.completeAiRequestLog({
      logId,
      model,
      usage: tokenTotals(accounting),
      responsePayload: { completed: true },
      durationMs: Date.now() - startedAt,
    })
    await persistAccounting(logId, accounting)
    await reportImageEdit({
      logId,
      accounting,
      durationMs: Date.now() - startedAt,
      failed: false,
    })
    return { binaryData: new Uint8Array(image.bytes), mimeType: image.mimeType }
  } catch {
    const error = new Error(
      'Could not beautify this picture. Your original is safe. Check Settings > AI and try again.',
    )
    await recorder.failAiRequestLog({
      logId,
      model,
      error,
      usage: tokenTotals(accounting),
      durationMs: Date.now() - startedAt,
    })
    await persistAccounting(logId, accounting)
    await reportImageEdit({
      logId,
      accounting,
      durationMs: Date.now() - startedAt,
      failed: true,
    })
    throw error
  }
}

function tokenTotals(accounting: ReturnType<typeof imageEditAccounting>) {
  const usage = accounting.usage
  return {
    promptTokens: usage?.input_tokens ?? 0,
    completionTokens: usage?.output_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
    promptTokensDetails: {
      cachedTokens: usage?.input_tokens_details.cached_tokens ?? 0,
    },
  }
}
async function persistAccounting(
  logId: number,
  accounting: ReturnType<typeof imageEditAccounting>,
) {
  try {
    await updateAiAccounting(logId, { imageAccounting: accounting })
  } catch {
    console.error('Could not persist image usage accounting', {
      requestLogId: logId,
    })
  }
}
