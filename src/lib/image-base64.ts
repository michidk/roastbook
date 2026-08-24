/** The base64 payload and MIME type of a fetched image. */
export interface EncodedImage {
  readonly base64: string
  readonly mimeType: string
}

/** Splits the base64 payload out of a `data:` URL. */
export function dataUrlToBase64(dataUrl: string): string | null {
  const base64 = dataUrl.split(',', 2)[1]
  return base64 || null
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that picture'))
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read that picture'))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Downloads an image URL and returns its base64 payload, for example to send
 * a stored image to an AI extraction server function.
 */
export async function fetchImageAsBase64(url: string): Promise<EncodedImage> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load that picture')
  const blob = await response.blob()
  const base64 = dataUrlToBase64(await readBlobAsDataUrl(blob))
  if (!base64) throw new Error('Could not read that picture')
  return { base64, mimeType: blob.type }
}
