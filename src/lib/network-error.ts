const NETWORK_ERROR_PATTERN =
  /\b(?:failed to fetch|fetch failed|networkerror|network error|load failed)\b/i

/** True for failures to reach the server, as opposed to errors it returned. */
export function isNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''
  return NETWORK_ERROR_PATTERN.test(message)
}
