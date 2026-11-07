import '@tanstack/react-start/server-only'
import { mcp } from '@better-auth/mcp'
import { jwt } from 'better-auth/plugins'
import { and, eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { oauthConsent } from '@/db/schema'

export const MCP_SCOPES = ['mcp:read', 'mcp:write', 'offline_access']

export function mcpAuthPlugins(origin: string) {
  const resource = `${origin}/api/mcp`
  return [
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      resource,
      loginPage: '/login',
      consentPage: '/oauth/consent',
      scopes: MCP_SCOPES,
      resources: [
        {
          identifier: resource,
          name: 'Roastbook journal',
          allowedScopes: MCP_SCOPES,
        },
      ],
      grantTypes: ['authorization_code', 'refresh_token'],
      accessTokenExpiresIn: 300,
      codeExpiresIn: 600,
      refreshTokenExpiresIn: 60 * 60 * 24 * 30,
      refreshTokenReuseInterval: 0,
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultApplicationType: 'infer',
      clientPrivileges: () => false,
      extensions: [
        {
          claims: {
            accessToken: async ({ user, client }) => {
              if (!user) throw new Error('User authorization is required')
              const [grant] = await getControlDb()
                .select({ id: oauthConsent.id })
                .from(oauthConsent)
                .where(
                  and(
                    eq(oauthConsent.userId, user.id),
                    eq(oauthConsent.clientId, client.clientId),
                  ),
                )
              if (!grant) throw new Error('Consent is required')
              return { roastbook_grant: grant.id }
            },
          },
        },
      ],
    }),
  ] as const
}
