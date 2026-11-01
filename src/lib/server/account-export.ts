import { and, eq, gt } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { accountJobs } from '@/db/schema'
import { getStorage } from '@/lib/storage'

export async function downloadAccountExport(id: string) {
  const identity = requireIdentity()
  const [job] = await getControlDb()
    .select()
    .from(accountJobs)
    .where(
      and(
        eq(accountJobs.id, id),
        eq(accountJobs.userId, identity.id),
        eq(accountJobs.kind, 'export'),
        eq(accountJobs.status, 'ready'),
        gt(accountJobs.expiresAt, new Date()),
      ),
    )
  if (!job?.storagePath) return new Response('Not found', { status: 404 })
  const stream = await getStorage().downloadStream(job.storagePath)
  const chunks = stream[Symbol.asyncIterator]()
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        const chunk = await chunks.next()
        if (chunk.done) controller.close()
        else controller.enqueue(new Uint8Array(chunk.value))
      },
      cancel() {
        stream.destroy()
      },
    }),
    {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="roastbook-export.zip"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}
