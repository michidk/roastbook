import { createFileRoute } from "@tanstack/react-router"
import { getStorage } from "@/lib/storage"

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
}

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const search = new URL(request.url).searchParams
        const requestedPath = search.get("path")
        const fallbackPath = search.get("fallback")
        if (!requestedPath) {
          return new Response("Not found", { status: 404 })
        }

        const paths = fallbackPath
          ? [requestedPath, fallbackPath]
          : [requestedPath]
        if (paths.some((path) => path.includes("..") || path.startsWith("/"))) {
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
          const ext = path.split(".").pop()?.toLowerCase() || ""
          const contentType = CONTENT_TYPES[ext] || "application/octet-stream"

          return new Response(blob, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          })
        } catch (error) {
          console.error(`Failed to serve upload: ${requestedPath}`, error)
          return new Response("Internal server error", { status: 500 })
        }
      },
    },
  },
})
