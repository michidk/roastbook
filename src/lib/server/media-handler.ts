import { defineHandler } from "nitro"
import { getStorage } from "@/lib/storage"

const CONTENT_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
}

export default defineHandler(async (event) => {
  const url = new URL(event.req.url)
  let requestedPath: string
  try {
    requestedPath = url.pathname
      .slice("/media/".length)
      .split("/")
      .map(decodeURIComponent)
      .join("/")
  } catch (error) {
    if (error instanceof URIError) return new Response("Bad request", { status: 400 })
    throw error
  }

  const fallbackPath = url.searchParams.get("fallback")
  const paths = fallbackPath ? [requestedPath, fallbackPath] : [requestedPath]
  if (
    !requestedPath ||
    paths.some((path) => path.includes("..") || path.startsWith("/"))
  ) {
    return new Response("Forbidden", { status: 403 })
  }

  const storage = getStorage()

  try {
    let path = requestedPath
    if (!(await storage.exists(path))) {
      if (!fallbackPath || !(await storage.exists(fallbackPath))) {
        return new Response("Not found", { status: 404 })
      }
      path = fallbackPath
    }

    const blob = await storage.download(path)
    const extension = path.split(".").pop()?.toLowerCase() || ""

    return new Response(blob, {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
        "Vary": "Cookie, Authorization",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error(`Failed to serve media: ${requestedPath}`, error)
    return new Response("Internal server error", { status: 500 })
  }
})
