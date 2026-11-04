/** Includes all encoded variants so a retried command cannot overwrite different bytes. */
export async function journalImageDigest(
  files: readonly string[],
): Promise<string> {
  const bytes = new TextEncoder().encode(files.join(','))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
