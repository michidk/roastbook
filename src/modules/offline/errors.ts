const NETWORK_ERROR_PATTERN =
  /\b(?:failed to fetch|fetch failed|networkerror|network error|load failed)\b/i

const CONFLICT_ERROR_PATTERN = /\bchanged on the server\b|\bconflict\b/i

const DEFINITIVE_SYNC_ERROR_PATTERNS = [
  /brewing method not found/i,
  /selected bag not found/i,
  /selected bag does not belong/i,
  /brew not found/i,
  /already synced and deleted/i,
  /invalid input/i,
  /too_big|too_small|invalid_type|invalid_value|invalid_format|unrecognized_keys/i,
  /too (?:big|small|long|short)/i,
  /must be/i,
  /is required/i,
  /cannot be/i,
  /between .* and/i,
  /unsupported offline operation/i,
  /image data is missing/i,
]

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : ''
}

export function isNetworkError(error: unknown): boolean {
  return NETWORK_ERROR_PATTERN.test(errorMessage(error))
}

export function isConflictError(error: unknown): boolean {
  return CONFLICT_ERROR_PATTERN.test(errorMessage(error))
}

/**
 * Validation and domain rejections will not succeed on a retry. Everything
 * else (5xx responses, proxy failures, timeouts, unknown server errors) stays
 * queued for the next automatic sync.
 */
export function isDefinitiveSyncError(error: unknown): boolean {
  const message = errorMessage(error)
  return DEFINITIVE_SYNC_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}
