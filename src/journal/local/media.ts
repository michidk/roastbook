/** Object URLs for pictures stored in this browser, by storage path. */
const urls = new Map<string, string>()

export function rememberLocalMedia(path: string, blob: Blob) {
  const previous = urls.get(path)
  if (previous) URL.revokeObjectURL(previous)
  urls.set(path, URL.createObjectURL(blob))
}

export function forgetLocalMedia(paths?: Iterable<string>) {
  for (const path of paths ?? [...urls.keys()]) {
    const url = urls.get(path)
    if (url) URL.revokeObjectURL(url)
    urls.delete(path)
  }
}

export function localMediaObjectUrl(path: string) {
  return urls.get(path)
}

type MediaClient = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
}
/** Registers stored pictures this tab has not seen: after a reload or another tab's write. */
export async function loadLocalMedia(client: MediaClient) {
  const result = await client.query<{
    path: string
    mime_type: string
    data: Uint8Array
  }>(
    'select path, mime_type, data from roastbook_local.media where not (path = any($1))',
    [[...urls.keys()]],
  )
  for (const row of result.rows)
    rememberLocalMedia(
      row.path,
      new Blob([row.data as BlobPart], { type: row.mime_type }),
    )
}
