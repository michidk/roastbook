import assert from 'node:assert/strict'
import {
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from 'node:crypto'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

// A separate process keeps the ephemeral auth origin out of other test suites.
assert(process.env.TEST_DATABASE_URL, 'An isolated test database is required')
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.AUTH_ENABLED = 'true'
process.env.DEPLOYMENT_MODE = 'self-hosted'
process.env.AUTH_SECRET ??= Buffer.alloc(32, 47).toString('hex')
process.env.EMAIL_FROM = 'test@example.test'
process.env.SMTP_URL = 'smtp://127.0.0.1:1'
let dispatch: (request: Request) => Promise<Response> = async () =>
  new Response(null, { status: 503 })
const server = Bun.serve({
  port: 0,
  hostname: '127.0.0.1',
  fetch: (request) => dispatch(request),
})
const origin = server.url.origin
const resource = `${origin}/api/mcp`
process.env.AUTH_URL = origin

const { getControlDb, getJournalDb, getOAuthLockDb } = await import(
  '../src/db/connection.server'
)
const { getAuth } = await import('../src/lib/server/auth/auth.server')
const { withJournal } = await import('../src/db/journal-context.server')
const { requireIdentity } = await import('../src/db/journal-context.server')
const schema = await import('../src/db/schema')
const { db } = await import('../src/db')
const { handleJournalRequest, hashIntegrationToken } = await import(
  '../src/lib/server/auth/request.server'
)
const { handleMcpHttpRequest } = await import(
  '../src/lib/server/mcp/http.server'
)
const { loadConsent, listOAuthGrants, revokeOAuthGrant } = await import(
  '../src/lib/server/auth/oauth-grants.server'
)
const { withOAuthClientLock } = await import(
  '../src/lib/server/auth/oauth-lock.server'
)
const { saveMcpPolicy } = await import('../src/lib/server/mcp/settings.server')
const { allowMcpRequest } = await import(
  '../src/lib/server/mcp/rate-limit.server'
)
const control = getControlDb()
const users = [0, 1].map(() => ({
  id: `mcp-test-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'user' as const,
  authentication: true,
  authenticatedAt: new Date(),
}))
function userAt(index: number) {
  const user = users[index]
  assert(user)
  return user
}
const first = userAt(0),
  second = userAt(1)
const clients: string[] = []
const cookies: string[] = []
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
})
const meta = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
}
function rpc(method: string, params: object = {}, bearer?: string) {
  return fetch(resource, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Mcp-Method': method,
      'MCP-Protocol-Version': '2026-07-28',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params: { _meta: meta, ...params },
    }),
  })
}
function api(path: string, body: object, cookie?: string) {
  const form = path === '/oauth2/token'
  return fetch(`${origin}/api/auth${path}`, {
    method: 'POST',
    headers: {
      'content-type': form
        ? 'application/x-www-form-urlencoded'
        : 'application/json',
      origin,
      'x-real-ip': '192.0.2.41',
      ...(cookie ? { cookie } : {}),
    },
    body: form
      ? new URLSearchParams(
          Object.entries(body).map(([key, value]) => [key, String(value)]),
        )
      : JSON.stringify(body),
    redirect: 'manual',
  })
}
async function json(response: Response) {
  const body: unknown = await response.json()
  assert(response.ok, `HTTP ${response.status}: ${JSON.stringify(body)}`)
  return body
}
async function register() {
  const data = z.object({ client_id: z.string() }).parse(
    await json(
      await api('/oauth2/register', {
        client_name: 'Roastbook integration test',
        redirect_uris: ['http://127.0.0.1:19191/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        scope: 'mcp:read mcp:write offline_access',
      }),
    ),
  )
  clients.push(data.client_id)
  return data.client_id
}
async function authorize(
  client: string,
  scope = 'mcp:read offline_access',
  cookie = cookies[0],
  accept = true,
) {
  assert(cookie)
  const verifier = randomBytes(32).toString('base64url')
  const query = new URLSearchParams({
    client_id: client,
    redirect_uri: 'http://127.0.0.1:19191/callback',
    response_type: 'code',
    scope,
    resource,
    state: randomUUID(),
    prompt: 'consent',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  })
  const response = await fetch(`${origin}/api/auth/oauth2/authorize?${query}`, {
    headers: { cookie },
    redirect: 'manual',
  })
  assert.equal(response.status, 302, await response.clone().text())
  const page = new URL(response.headers.get('location') ?? '', origin)
  assert.equal(page.pathname, '/oauth/consent', page.href)
  const signed = page.search.slice(1)
  const grant = await withJournal(first, () => loadConsent(signed))
  assert.equal(grant.clientId, client)
  await assert.rejects(
    withJournal(first, () =>
      loadConsent(signed.replace('mcp%3Aread', 'mcp%3Awrite')),
    ),
  )
  const decision = z
    .object({ url: z.string() })
    .parse(
      await json(
        await api('/oauth2/consent', { accept, oauth_query: signed }, cookie),
      ),
    )
  const redirect = new URL(decision.url)
  assert.equal(redirect.searchParams.get('state'), query.get('state'))
  if (!accept) {
    assert.equal(redirect.searchParams.get('error'), 'access_denied')
    return { code: '', verifier, signed }
  }
  const code = redirect.searchParams.get('code')
  assert(code, decision.url)
  return { code, verifier, signed }
}
async function exchange(client: string, code: string, verifier: string) {
  return api('/oauth2/token', {
    grant_type: 'authorization_code',
    client_id: client,
    redirect_uri: 'http://127.0.0.1:19191/callback',
    code,
    code_verifier: verifier,
    resource,
  })
}
dispatch = async (request) => {
  try {
    return await handleJournalRequest(request, async () => {
      const response = await handleMcpHttpRequest(request)
      if (response) return response
      return Response.json({ owner: requireIdentity().id })
    })
  } catch (error) {
    console.error(error)
    return new Response('Request failed', { status: 500 })
  }
}
try {
  await control.insert(schema.authUsers).values(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      emailVerified: true,
      journalInitializedAt: new Date(),
    })),
  )
  for (const user of users) {
    const token = randomBytes(32).toString('base64url')
    await control.insert(schema.authSessions).values({
      id: randomUUID(),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600_000),
    })
    const signature = createHmac('sha256', process.env.AUTH_SECRET)
      .update(token)
      .digest('base64')
    cookies.push(
      `roastbook.session_token=${encodeURIComponent(`${token}.${signature}`)}`,
    )
    await withJournal(user, async () => {
      await db.insert(schema.beans).values({ name: user.id })
    })
  }
  const probe = await fetch(`${origin}/owner`, {
    headers: { cookie: cookies[0] ?? '' },
  })
  assert.equal(probe.status, 200, await probe.clone().text())
  const missing = await rpc('tools/list')
  assert.equal(missing.status, 401)
  assert.match(
    missing.headers.get('www-authenticate') ?? '',
    /resource_metadata=/,
  )
  for (const path of [
    '/.well-known/oauth-protected-resource/api/mcp',
    '/.well-known/oauth-authorization-server/api/auth',
  ]) {
    const discovery = await json(await fetch(origin + path))
    assert(discovery)
  }
  assert.equal((await fetch(`${origin}/api/auth/token`)).status, 404)
  assert.equal((await api('/oauth2/create-client', {})).status, 404)
  const client = await register()
  await authorize(client, 'mcp:read', cookies[0], false)
  assert.equal(
    (
      await control
        .select()
        .from(schema.oauthConsent)
        .where(eq(schema.oauthConsent.clientId, client))
    ).length,
    0,
  )
  const auth = await authorize(client)
  const issued = tokenSchema.parse(
    await json(await exchange(client, auth.code, auth.verifier)),
  )
  const payload = z
    .record(z.string(), z.unknown())
    .parse(
      JSON.parse(
        Buffer.from(
          issued.access_token.split('.')[1] ?? '',
          'base64url',
        ).toString(),
      ),
    )
  for (const override of [
    { aud: `${origin}/another-resource` },
    { iss: 'https://wrong-issuer.example' },
    { exp: Math.floor(Date.now() / 1000) - 120 },
  ]) {
    const invalid = await getAuth().api.signJWT({
      body: { payload: { ...payload, ...override } },
    })
    assert.equal((await rpc('tools/list', {}, invalid.token)).status, 401)
  }
  assert.equal(issued.expires_in, 300)
  assert(issued.refresh_token)
  const key = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const jwk = key.publicKey.export({ format: 'jwk' })
  function proof(url: string, token?: string) {
    const header = Buffer.from(
      JSON.stringify({ typ: 'dpop+jwt', alg: 'ES256', jwk }),
    ).toString('base64url')
    const claims = Buffer.from(
      JSON.stringify({
        htm: 'POST',
        htu: url,
        jti: randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        ...(token
          ? { ath: createHash('sha256').update(token).digest('base64url') }
          : {}),
      }),
    ).toString('base64url')
    const input = `${header}.${claims}`
    return `${input}.${sign('sha256', Buffer.from(input), {
      key: key.privateKey,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url')}`
  }
  const boundAuthorization = await authorize(client)
  const bound = tokenSchema.extend({ token_type: z.literal('DPoP') }).parse(
    await json(
      await fetch(`${origin}/api/auth/oauth2/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          dpop: proof(`${origin}/api/auth/oauth2/token`),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: client,
          code: boundAuthorization.code,
          code_verifier: boundAuthorization.verifier,
          redirect_uri: 'http://127.0.0.1:19191/callback',
          resource,
        }),
      }),
    ),
  )
  function proxiedCall(dpop?: string) {
    return dispatch(
      new Request('http://internal-app:3000/api/mcp', {
        method: 'POST',
        headers: {
          host: new URL(origin).host,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'Mcp-Method': 'tools/list',
          'MCP-Protocol-Version': '2026-07-28',
          Authorization: `DPoP ${bound.access_token}`,
          ...(dpop ? { dpop } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: { _meta: meta },
        }),
      }),
    )
  }
  const validProof = proof(resource, bound.access_token)
  const verifiedProof = await proxiedCall(validProof)
  assert.equal(verifiedProof.status, 200, await verifiedProof.text())
  assert.equal((await proxiedCall(validProof)).status, 401)
  assert.equal((await proxiedCall()).status, 401)
  assert.equal(
    (await proxiedCall(proof(`${origin}/wrong-path`, bound.access_token)))
      .status,
    401,
  )
  assert.equal((await rpc('tools/list', {}, bound.access_token)).status, 401)
  const sdk = new Client(
    { name: 'production-test', version: '1' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } },
  )
  await sdk.connect(
    new StreamableHTTPClientTransport(new URL(resource), {
      requestInit: {
        headers: { Authorization: `Bearer ${issued.access_token}` },
      },
    }),
  )
  try {
    const tools = await sdk.listTools()
    assert(tools.tools.some((tool) => tool.name === 'list_beans'))
    assert(!tools.tools.some((tool) => tool.name === 'create_brew'))
    const beans = await sdk.callTool({ name: 'list_beans', arguments: {} })
    const result = JSON.stringify(beans)
    assert(result.includes(first.id), result)
    assert(!result.includes(second.id), result)
  } finally {
    await sdk.close()
  }
  assert.equal(
    (
      await rpc(
        'tools/call',
        { name: 'create_brew', arguments: {} },
        issued.access_token,
      )
    ).status,
    403,
  )
  assert.equal(
    (await rpc('tools/list', {}, issued.access_token.slice(0, -8) + 'tampered'))
      .status,
    401,
  )
  assert.equal(
    (
      await fetch(`${origin}/owner`, {
        headers: { Authorization: `Bearer ${issued.access_token}` },
      })
    ).status,
    401,
  )
  const badPkce = await authorize(client)
  assert.equal(
    (
      await exchange(
        client,
        badPkce.code,
        randomBytes(32).toString('base64url'),
      )
    ).status,
    400,
  )
  const refreshed = tokenSchema.parse(
    await json(
      await api('/oauth2/token', {
        grant_type: 'refresh_token',
        client_id: client,
        refresh_token: issued.refresh_token,
        resource,
      }),
    ),
  )
  assert(
    refreshed.refresh_token && refreshed.refresh_token !== issued.refresh_token,
  )
  assert.equal(
    (
      await api('/oauth2/token', {
        grant_type: 'refresh_token',
        client_id: client,
        refresh_token: issued.refresh_token,
        resource,
      })
    ).status,
    400,
  )
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const locked = withOAuthClientLock(client, async () => {
    entered.resolve()
    await release.promise
  })
  await entered.promise
  try {
    const conflicts = await Promise.all(
      Array.from({ length: 12 }, () =>
        api('/oauth2/token', {
          grant_type: 'refresh_token',
          client_id: client,
          refresh_token: refreshed.refresh_token,
          resource,
        }),
      ),
    )
    assert(conflicts.every((response) => response.status === 429))
  } finally {
    release.resolve()
    await locked
  }
  const readWrite = await authorize(client, 'mcp:read mcp:write offline_access')
  const rw = tokenSchema.parse(
    await json(await exchange(client, readWrite.code, readWrite.verifier)),
  )
  const toolsBody = await (await rpc('tools/list', {}, rw.access_token)).text()
  assert(toolsBody.includes('create_brew'), toolsBody)
  await withJournal(first, () =>
    saveMcpPolicy({ enabled: false, disabledTools: [] }),
  )
  assert.equal((await rpc('tools/list', {}, rw.access_token)).status, 503)
  await withJournal(first, () =>
    saveMcpPolicy({ enabled: true, disabledTools: ['list_beans'] }),
  )
  assert(
    !(await (await rpc('tools/list', {}, rw.access_token)).text()).includes(
      '"name":"list_beans"',
    ),
  )
  await withJournal(first, () =>
    saveMcpPolicy({ enabled: true, disabledTools: [] }),
  )
  const grants = await withJournal(first, listOAuthGrants)
  const grant = grants.find((item) => item.clientId === client)
  assert(grant)
  assert.equal((await withJournal(second, listOAuthGrants)).length, 0)
  await assert.rejects(withJournal(second, () => revokeOAuthGrant(grant.id)))
  await withJournal(first, () => revokeOAuthGrant(grant.id))
  assert.equal((await rpc('tools/list', {}, rw.access_token)).status, 401)
  assert.equal(
    (
      await api('/oauth2/token', {
        grant_type: 'refresh_token',
        client_id: client,
        refresh_token: rw.refresh_token,
        resource,
      })
    ).status,
    400,
  )
  const reconnect = await authorize(client)
  const again = tokenSchema.parse(
    await json(await exchange(client, reconnect.code, reconnect.verifier)),
  )
  assert.equal((await rpc('tools/list', {}, again.access_token)).status, 200)
  assert.equal((await rpc('tools/list', {}, rw.access_token)).status, 401)
  await control
    .update(schema.oauthClient)
    .set({ disabled: true })
    .where(eq(schema.oauthClient.clientId, client))
  assert.equal((await rpc('tools/list', {}, again.access_token)).status, 401)
  await control
    .update(schema.oauthClient)
    .set({ disabled: false })
    .where(eq(schema.oauthClient.clientId, client))
  await control
    .update(schema.authUsers)
    .set({ deletingAt: new Date() })
    .where(eq(schema.authUsers.id, first.id))
  assert.equal((await rpc('tools/list', {}, again.access_token)).status, 401)
  await control
    .update(schema.authUsers)
    .set({ deletingAt: null })
    .where(eq(schema.authUsers.id, first.id))
  const manual = randomBytes(32).toString('base64url'),
    shottimer = randomBytes(32).toString('base64url')
  await control.insert(schema.integrationTokens).values(
    [
      ['mcp', manual],
      ['shottimer', shottimer],
    ].map(([kind, token]) => ({
      id: randomUUID(),
      userId: first.id,
      kind: kind === 'mcp' ? ('mcp' as const) : ('shottimer' as const),
      tokenHash: hashIntegrationToken(token ?? ''),
      name: 'Test',
      expiresAt: new Date(Date.now() + 60_000),
    })),
  )
  assert.equal((await rpc('tools/list', {}, manual)).status, 200)
  assert.equal((await rpc('tools/list', {}, shottimer)).status, 401)
  assert.equal((await fetch(resource, { method: 'GET' })).status, 405)
  assert.equal(
    (await fetch(resource, { method: 'POST', body: 'no' })).status,
    415,
  )
  assert.equal(
    (
      await fetch(resource, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'x'.repeat(1024 * 1024 + 1),
      })
    ).status,
    413,
  )
  assert.equal(
    (
      await fetch(resource, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${manual}`,
        },
        body: '{',
      })
    ).status,
    400,
  )
  await control
    .delete(schema.authRateLimits)
    .where(eq(schema.authRateLimits.key, `mcp:${first.id}`))
  const limits = await withJournal(first, () =>
    Promise.all(Array.from({ length: 125 }, () => allowMcpRequest())),
  )
  assert.equal(limits.filter(Boolean).length, 120)
  assert.equal((await rpc('tools/list', {}, manual)).status, 429)
  // Untrusted metadata must never reach internal services, including through DNS names.
  const { fetchClientMetadataResource } = await import('@better-auth/cimd/node')
  for (const host of ['127.0.0.1', 'localhost', '169.254.169.254'])
    await assert.rejects(async () =>
      fetchClientMetadataResource(`https://${host}/client.json`),
    )
  console.info(
    'MCP OAuth, PKCE, real SDK calls, scopes, isolation, rotation, revocation, transport, and rate limit passed',
  )
} finally {
  await control
    .delete(schema.oauthClient)
    .where(inArray(schema.oauthClient.clientId, clients))
  for (const user of users)
    await withJournal(user, async () => {
      await db.delete(schema.beans)
      await db.delete(schema.mcpSettings)
    })
  await control.delete(schema.authRateLimits).where(
    inArray(
      schema.authRateLimits.key,
      users.map((user) => `mcp:${user.id}`),
    ),
  )
  await control.delete(schema.authUsers).where(
    inArray(
      schema.authUsers.id,
      users.map((user) => user.id),
    ),
  )
  await server.stop(true)
  await control.$client.end({ timeout: 5 })
  await getOAuthLockDb().$client.end({ timeout: 5 })
  await getJournalDb().$client.end({ timeout: 5 })
}
