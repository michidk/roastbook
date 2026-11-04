import { decodeBase64, encodeBase64 } from '@/lib/base64'

/**
 * JSON encoding for journal function inputs kept in the outbox and replayed on
 * the server. Dates, files and form data survive the round trip.
 */
export type EncodedInput = unknown

type Tagged =
  | { $date: string }
  | { $file: { name: string; type: string; data: string } }
  | { $blob: { type: string; data: string } }
  | { $form: Array<[string, EncodedInput]> }

async function bytes(blob: Blob) {
  return encodeBase64(new Uint8Array(await blob.arrayBuffer()))
}

export async function encodeInput(value: unknown): Promise<EncodedInput> {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (typeof File !== 'undefined' && value instanceof File)
    return {
      $file: { name: value.name, type: value.type, data: await bytes(value) },
    }
  if (value instanceof Blob)
    return { $blob: { type: value.type, data: await bytes(value) } }
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    const entries: Array<[string, EncodedInput]> = []
    for (const [key, entry] of value.entries())
      entries.push([key, await encodeInput(entry)])
    return { $form: entries }
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeInput))
  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(
        async ([key, entry]) => [key, await encodeInput(entry)] as const,
      ),
    )
    return Object.fromEntries(entries)
  }
  return value
}

export function decodeInput(value: EncodedInput): unknown {
  if (Array.isArray(value)) return value.map(decodeInput)
  if (!value || typeof value !== 'object') return value
  const tagged = value as Partial<Tagged & Record<string, unknown>>
  if (typeof tagged.$date === 'string') return new Date(tagged.$date)
  if (tagged.$file && typeof tagged.$file === 'object') {
    const file = tagged.$file as { name: string; type: string; data: string }
    return new File([decodeBase64(file.data) as BlobPart], file.name, {
      type: file.type,
    })
  }
  if (tagged.$blob && typeof tagged.$blob === 'object') {
    const blob = tagged.$blob as { type: string; data: string }
    return new Blob([decodeBase64(blob.data) as BlobPart], { type: blob.type })
  }
  if (Array.isArray(tagged.$form)) {
    const form = new FormData()
    for (const [key, entry] of tagged.$form as Array<[string, EncodedInput]>) {
      const decoded = decodeInput(entry)
      form.append(key, decoded instanceof Blob ? decoded : String(decoded))
    }
    return form
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, decodeInput(entry)]),
  )
}
/** Starts the message of a change the server can never apply as recorded. */
export const rejectedPrefix = 'Change rejected: '
