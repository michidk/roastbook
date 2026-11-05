import '@tanstack/react-start/server-only'
import { and, eq } from 'drizzle-orm'
import { getAiControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { aiWeeklyUsage, authUsers } from '@/db/schema'
import { aiAllowanceWeek } from '@/lib/ai-allowance'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { getHostedEnv } from '@/cloudflare/hosted-env.server'

export function providedAiConfig() {
  const env = { ...getServerEnv(), ...getHostedEnv() }
  if (
    DEMO_MODE ||
    !env.AUTH_ENABLED ||
    !env.AI_PROVIDED_API_KEY ||
    !env.AI_PROVIDED_VISION_MODEL ||
    !env.AI_PROVIDED_RESEARCH_MODEL
  )
    return null
  return {
    providerMode: 'provided' as const,
    baseURL: env.AI_PROVIDED_BASE_URL,
    api: env.AI_PROVIDED_API,
    apiKey: env.AI_PROVIDED_API_KEY,
    visionModel: env.AI_PROVIDED_VISION_MODEL,
    researchModel: env.AI_PROVIDED_RESEARCH_MODEL,
  }
}

export async function loadAiAllowance() {
  if (DEMO_MODE)
    return {
      mode: 'byo' as const,
      providedAvailable: false,
      limit: 0,
      used: 0,
      resetAt: aiAllowanceWeek().resetAt,
    }
  const identity = requireIdentity()
  const { start, resetAt } = aiAllowanceWeek()
  const database = getAiControlDb()
  const [[account], [usage]] = await Promise.all([
    database
      .select({
        mode: authUsers.aiProviderMode,
        limit: authUsers.aiWeeklyLimit,
      })
      .from(authUsers)
      .where(eq(authUsers.id, identity.id)),
    database
      .select()
      .from(aiWeeklyUsage)
      .where(
        and(
          eq(aiWeeklyUsage.userId, identity.id),
          eq(aiWeeklyUsage.weekStart, start),
        ),
      ),
  ])
  if (!account) throw new Error('Account is unavailable')
  const available = identity.authentication && !!providedAiConfig()
  return {
    mode: available ? account.mode : ('byo' as const),
    providedAvailable: available,
    limit: account.limit,
    used: usage?.requests ?? 0,
    resetAt,
  }
}

export async function selectAiProvider(mode: 'provided' | 'byo') {
  const identity = requireIdentity()
  if (DEMO_MODE) throw new Error('AI settings cannot be changed in the demo')
  if (mode === 'provided' && (!identity.authentication || !providedAiConfig()))
    throw new Error('Provided AI is unavailable on this installation')
  await getAiControlDb()
    .update(authUsers)
    .set({ aiProviderMode: mode })
    .where(eq(authUsers.id, identity.id))
}
