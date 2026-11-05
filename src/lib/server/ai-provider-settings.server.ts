import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { getAiControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { aiProviderCredentials } from '@/db/schema'
import {
  type AiProviderSettingsInput,
  DEFAULT_AI_PROVIDER,
} from '@/lib/ai-provider'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import {
  normalizeAiEndpoint,
  resolveAiEndpoint,
} from '@/lib/server/ai-provider-fetch.server'
import { consumeReauthentication } from '@/lib/server/auth/reauthentication.server'
import { decryptAiKey, encryptAiKey } from './ai-credential.server'

export async function readAiProviderCredentials() {
  if (DEMO_MODE) return undefined
  const identity = requireIdentity()
  const [row] = await getAiControlDb()
    .select()
    .from(aiProviderCredentials)
    .where(eq(aiProviderCredentials.userId, identity.id))
  return row
}
export async function loadAiProviderSettings() {
  const row = await readAiProviderCredentials()
  return {
    ...(row
      ? {
          baseURL: row.baseURL,
          api: row.api,
          visionModel: row.visionModel,
          researchModel: row.researchModel,
        }
      : DEFAULT_AI_PROVIDER),
    hasApiKey: !!row,
    canConfigure: !DEMO_MODE && !!getServerEnv().AI_CREDENTIAL_ENCRYPTION_KEY,
  }
}
function requireCredentialChange() {
  if (DEMO_MODE) throw new Error('AI settings cannot be changed in the demo')
  return requireIdentity()
}
export async function saveAiProviderSettings(
  input: AiProviderSettingsInput,
  reauthToken?: string,
) {
  const identity = requireCredentialChange()
  if (!getServerEnv().AI_CREDENTIAL_ENCRYPTION_KEY)
    throw new Error(
      'AI credential storage is unavailable. Contact the administrator.',
    )
  const baseURL = normalizeAiEndpoint(input.baseURL)
  const previous = await readAiProviderCredentials()
  if (!input.apiKey && (!previous || previous.baseURL !== baseURL))
    throw new Error(
      'Enter your API key when connecting or changing the endpoint',
    )
  await resolveAiEndpoint(baseURL)
  const encryptedApiKey = input.apiKey
    ? encryptAiKey(input.apiKey, identity.id, baseURL)
    : previous?.encryptedApiKey
  if (!encryptedApiKey) throw new Error('Enter your API key')
  // Only a valid change uses up the confirmation.
  await consumeReauthentication('save-ai-credentials', reauthToken)
  await getAiControlDb()
    .insert(aiProviderCredentials)
    .values({
      userId: identity.id,
      baseURL,
      encryptedApiKey,
      api: input.api,
      visionModel: input.visionModel,
      researchModel: input.researchModel,
    })
    .onConflictDoUpdate({
      target: aiProviderCredentials.userId,
      set: {
        baseURL,
        encryptedApiKey,
        api: input.api,
        visionModel: input.visionModel,
        researchModel: input.researchModel,
        updatedAt: new Date(),
      },
    })
  return loadAiProviderSettings()
}
export async function removeAiProviderSettings() {
  const identity = requireCredentialChange()
  await getAiControlDb()
    .delete(aiProviderCredentials)
    .where(eq(aiProviderCredentials.userId, identity.id))
  return loadAiProviderSettings()
}
export async function getAiRuntimeConfig() {
  const row = await readAiProviderCredentials()
  if (!row) return null
  return {
    baseURL: row.baseURL,
    api: row.api,
    visionModel: row.visionModel,
    researchModel: row.researchModel,
    apiKey: decryptAiKey(row.encryptedApiKey, row.userId, row.baseURL),
  }
}
