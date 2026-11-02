import '@tanstack/react-start/server-only'
import { and, eq } from 'drizzle-orm'
import { oauthAccessToken, oauthConsent, oauthRefreshToken } from '@/db/schema'
import { getAuth } from './auth.server'
import { OAuthClientBusyError, withOAuthClientLock } from './oauth-lock.server'

export function coordinateTokenRequest(clientId: string, request: Request) {
  return withOAuthClientLock(clientId, () => getAuth().handler(request)).catch(
    (error: unknown) => {
      if (!(error instanceof OAuthClientBusyError)) throw error
      return Response.json(
        { error: 'temporarily_unavailable' },
        {
          status: 429,
          headers: { 'Retry-After': '1', 'Cache-Control': 'no-store' },
        },
      )
    },
  )
}

export async function coordinateRevokeGrant({
  clientId,
  userId,
  id,
}: {
  clientId: string
  userId: string
  id: string
}) {
  await withOAuthClientLock(clientId, async (tx) => {
    const [grant] = await tx
      .delete(oauthConsent)
      .where(
        and(
          eq(oauthConsent.id, id),
          eq(oauthConsent.userId, userId),
          eq(oauthConsent.clientId, clientId),
        ),
      )
      .returning({ id: oauthConsent.id })
    if (!grant) throw new Error('Application connection not found')
    await tx
      .delete(oauthAccessToken)
      .where(
        and(
          eq(oauthAccessToken.userId, userId),
          eq(oauthAccessToken.clientId, clientId),
        ),
      )
    await tx
      .delete(oauthRefreshToken)
      .where(
        and(
          eq(oauthRefreshToken.userId, userId),
          eq(oauthRefreshToken.clientId, clientId),
        ),
      )
  })
}
