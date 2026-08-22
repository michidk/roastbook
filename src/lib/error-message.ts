export function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback

  const message = error.message.replace(/\s+/g, ' ').trim()
  if (!message) return fallback
  if (
    message.length > 500 ||
    /<!doctype\s+html|<html|<head|<body|<title|<h1/i.test(message)
  ) {
    return 'The service is temporarily unavailable. Try again.'
  }

  return message
}
