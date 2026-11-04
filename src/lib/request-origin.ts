/** Use the configured public URL behind proxies; never trust forwarded headers. */
export function requestOrigin(request: Request, publicUrl?: string) {
  return new URL(publicUrl ?? request.url).origin
}
