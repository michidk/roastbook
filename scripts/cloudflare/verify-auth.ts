import { z } from 'zod'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { verifyAuthContract } from '../auth-contract'

const messages = z.array(z.object({ to: z.string(), text: z.string() }))
export async function verifyAuthentication(
  bindings: CloudflareRuntimeBindings,
) {
  await verifyAuthContract(async () => {
    const response = await bindings.ACCOUNT_EMAIL.fetch(
      'https://account-email.internal/messages',
    )
    return messages.parse(await response.json())
  })
}
