const DEFAULT_UPLOAD_ERROR = 'Could not upload this picture. Try again.'

function errorStatus(error: unknown): number | null {
  if (error instanceof Response) return error.status
  if (!error || typeof error !== 'object' || !('status' in error)) return null

  const status = error.status
  if (typeof status === 'number') return status
  if (typeof status === 'string' && /^\d{3}$/.test(status)) {
    return Number(status)
  }
  return null
}

function rawErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    const trimmed = error.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return rawErrorMessage(JSON.parse(trimmed)) || trimmed
      } catch {
        return trimmed
      }
    }
    return trimmed
  }

  if (error instanceof Error) return rawErrorMessage(error.message)
  if (error instanceof Response) return error.statusText.trim()
  if (!error || typeof error !== 'object') return ''

  if (Array.isArray(error)) {
    for (const item of error) {
      const message = rawErrorMessage(item)
      if (message) return message
    }
    return ''
  }

  if ('message' in error) {
    const message = rawErrorMessage(error.message)
    if (message) return message
  }
  if ('error' in error) return rawErrorMessage(error.error)
  return ''
}

export function getImageUploadErrorMessage(
  error: unknown,
  fallback = DEFAULT_UPLOAD_ERROR,
): string {
  const status = errorStatus(error)
  const rawMessage = rawErrorMessage(error)
  const normalizedMessage = rawMessage.replace(/\s+/g, ' ').trim()
  const details = `${status ?? ''} ${normalizedMessage}`.toLowerCase()

  if (
    status === 413 ||
    /\b413\b/.test(details) ||
    details.includes('request entity too large') ||
    details.includes('content too large') ||
    details.includes('payload too large')
  ) {
    return 'This picture is too large for the server. Choose a file under 10 MB and try again.'
  }

  if (status === 401 || status === 403) {
    return 'The upload was blocked. Sign in again, then retry.'
  }

  if (
    status === 408 ||
    status === 504 ||
    details.includes('timed out') ||
    details.includes('timeout')
  ) {
    return 'The upload timed out. Check your connection and try again.'
  }

  if (status === 429 || details.includes('too many requests')) {
    return 'Too many upload attempts. Wait a moment and try again.'
  }

  if (
    (status !== null && status >= 500) ||
    /<!doctype\s+html|<html|<head|<body|<title|<h1/i.test(normalizedMessage)
  ) {
    return 'The upload service is temporarily unavailable. Try again.'
  }

  if (
    details.includes('failed to fetch') ||
    details.includes('networkerror') ||
    details.includes('network error')
  ) {
    return 'Could not reach the upload service. Check your connection and try again.'
  }

  if (!normalizedMessage || normalizedMessage.length > 240) return fallback
  return normalizedMessage
}
