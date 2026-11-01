import { createFileRoute } from '@tanstack/react-router'
import { downloadAccountExport } from '@/lib/server/account-export'

export const Route = createFileRoute('/api/account/exports/$jobId')({
  server: {
    handlers: { GET: ({ params }) => downloadAccountExport(params.jobId) },
  },
})
