import { oauthProviderClient } from '@better-auth/oauth-provider/client'
import { passkeyClient } from '@better-auth/passkey/client'
import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // Callers control navigation so email sign-in can offer passkey setup first.
  disableDefaultFetchPlugins: true,
  plugins: [emailOTPClient(), passkeyClient(), oauthProviderClient()],
})
