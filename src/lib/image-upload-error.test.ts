import { describe, expect, test } from 'bun:test'
import { getImageUploadErrorMessage } from '@/lib/image-upload-error'

describe('image upload errors', () => {
  test('replaces an nginx 413 page with useful guidance', () => {
    const error = new Error(`
      <html>
        <head><title>413 Request Entity Too Large</title></head>
        <body><h1>413 Request Entity Too Large</h1></body>
      </html>
    `)

    expect(getImageUploadErrorMessage(error)).toBe(
      'This picture is too large for the server. Choose a file under 10 MB and try again.',
    )
  })

  test('uses the status code when a response has no readable body', () => {
    expect(
      getImageUploadErrorMessage(new Response(null, { status: 413 })),
    ).toBe(
      'This picture is too large for the server. Choose a file under 10 MB and try again.',
    )
  })

  test('never exposes an unknown proxy HTML response', () => {
    expect(
      getImageUploadErrorMessage(
        '<html><head><title>Bad Gateway</title></head></html>',
      ),
    ).toBe('The upload service is temporarily unavailable. Try again.')
  })

  test('never exposes a Hodor upstream failure page', () => {
    expect(
      getImageUploadErrorMessage(`
        <!DOCTYPE html><html lang="en"><head>
          <title>Roastbook Login</title>
        </head><body><main><p>502</p><h1>Upstream Unavailable</h1>
          <p>Hodor is running, but the downstream service could not be reached.</p>
        </main></body></html>
      `),
    ).toBe('The upload service is temporarily unavailable. Try again.')
  })

  test('keeps concise application validation messages', () => {
    expect(
      getImageUploadErrorMessage(
        new Error('An entity can have at most 20 images'),
      ),
    ).toBe('An entity can have at most 20 images')
  })

  test('reads structured error messages', () => {
    expect(
      getImageUploadErrorMessage('{"error":"Storage is unavailable"}'),
    ).toBe('Storage is unavailable')
    expect(
      getImageUploadErrorMessage('[{"message":"Unsupported picture"}]'),
    ).toBe('Unsupported picture')
  })
})
