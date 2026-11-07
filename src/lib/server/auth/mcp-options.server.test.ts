import { expect, test } from 'bun:test'
import { betterAuth } from 'better-auth'
import { mcpAuthPlugins } from './mcp-options.server'

test('OAuth discovery advertises DCR without selecting CIMD', async () => {
  const origin = 'https://coffee.example.test'
  const auth = betterAuth({
    baseURL: origin,
    secret: 'roastbook-oauth-discovery-test-secret-only',
    plugins: [...mcpAuthPlugins(origin)],
  })
  const response = await auth.handler(
    new Request(`${origin}/api/auth/.well-known/oauth-authorization-server`),
  )
  expect(response.status).toBe(200)
  const metadata = await response.json()
  expect(metadata.registration_endpoint).toBe(
    `${origin}/api/auth/oauth2/register`,
  )
  expect(metadata.client_id_metadata_document_supported).not.toBe(true)
  expect(metadata.authorization_endpoint).toBe(
    `${origin}/api/auth/oauth2/authorize`,
  )
})
