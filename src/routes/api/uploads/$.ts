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

export const Route = createFileRoute("/api/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat
        if (!path) {
          return new Response("Not found", { status: 404 })
        }

        // Prevent path traversal
        if (path.includes("..")) {
          return new Response("Forbidden", { status: 403 })
        }

        const storage = getStorage()

        try {
          const exists = await storage.exists(path)
          if (!exists) {
            return new Response("Not found", { status: 404 })
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
          console.error(`Failed to serve upload: ${path}`, error)
          return new Response("Internal server error", { status: 500 })
        }
      },
    },
  },
})
