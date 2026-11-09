import { createFileRoute } from '@tanstack/react-router'
import { downloadAccountExport } from '@/lib/server/account-export'
import { reauthenticationTokenSchema } from '@/modules/auth/reauthentication'

// POST from a form, so the one-time confirmation never lands in a URL.
export const Route = createFileRoute('/api/account/exports/$jobId')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const token = reauthenticationTokenSchema.safeParse(
          (await request.formData().catch(() => null))?.get('reauthToken') ??
            undefined,
        )
        return downloadAccountExport(
          params.jobId,
          token.success ? token.data : undefined,
        )
      },
    },
  },
})
