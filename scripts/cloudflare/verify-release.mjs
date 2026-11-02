import assert from 'node:assert/strict'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'

const release = resolve(process.argv[2] ?? '.output/cloudflare')
const manifest = JSON.parse(
  await readFile(resolve(release, 'roastbook-release.json'), 'utf8'),
)
assert.deepEqual(manifest.compatibilityFlags, [
  'nodejs_compat',
  'global_fetch_strictly_public',
])
assert.deepEqual(manifest.durableObjects, ['OAuthCoordinator'])
const root = resolve(release, 'worker')
const paths = (await readdir(root, { recursive: true })).filter((path) =>
  path.endsWith('.js'),
)
const modules = await Promise.all(
  ['index.js', ...paths.filter((path) => path !== 'index.js')].map(
    async (path) => ({
      type: 'ESModule',
      path: resolve(root, path),
      contents: await readFile(resolve(root, path), 'utf8'),
    }),
  ),
)
const origin = 'https://app.example.test'
const resource = `${origin}/api/mcp`
const secret = randomBytes(32).toString('hex')
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    name: 'roastbook-release-verification',
    modules,
    modulesRoot: root,
    compatibilityDate: manifest.compatibilityDate,
    compatibilityFlags: manifest.compatibilityFlags,
    outboundService: async (request) => {
      const url = new URL(request.url)
      assert.equal(
        url.origin,
        origin,
        'verification must only fetch its own public JWKS endpoint',
      )
      assert.equal(url.pathname, '/api/auth/jwks')
      return runtime.dispatchFetch(request.url, {
        method: request.method,
        headers: Object.fromEntries(request.headers),
      })
    },
    d1Databases: ['DB'],
    r2Buckets: ['MEDIA'],
    durableObjects: {
      OAUTH_COORDINATOR: { className: 'OAuthCoordinator', useSQLite: true },
    },
    bindings: {
      AUTH_URL: origin,
      AUTH_SECRET: secret,
      AUTH_ADMIN_EMAIL: 'operator@example.test',
      EMAIL_FROM: 'roastbook@example.test',
      AUTH_ENABLED: 'true',
      AUTH_SIGNUP_ENABLED: 'true',
      DEPLOYMENT_MODE: 'hosted',
      ROASTBOOK_SOURCE_REVISION: manifest.revision,
    },
  }),
)
let requestNumber = 0
function dispatch(path, init = {}) {
  requestNumber++
  return runtime.dispatchFetch(new URL(path, origin).href, {
    ...init,
    headers: {
      'cf-connecting-ip': `198.51.100.${requestNumber}`,
      ...(init.method === 'POST' ? { origin } : {}),
      ...init.headers,
    },
    redirect: 'manual',
  })
}
function api(path, body, cookie) {
  const form = path === '/oauth2/token'
  return dispatch(`/api/auth${path}`, {
    method: 'POST',
    headers: {
      'content-type': form
        ? 'application/x-www-form-urlencoded'
        : 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: form ? new URLSearchParams(body) : JSON.stringify(body),
  })
}
async function json(response) {
  assert(
    response.ok,
    `HTTP ${response.status}: ${(await response.clone().text()).slice(0, 600)}`,
  )
  return response.json()
}
function rpc(bearer) {
  return dispatch('/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'Mcp-Method': 'tools/list',
      'MCP-Protocol-Version': '2026-07-28',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    }),
  })
}
try {
  const database = await runtime.getD1Database('DB')
  for (const file of Object.keys(manifest.files)
    .filter((path) => path.startsWith('migrations/') && path.endsWith('.sql'))
    .sort()) {
    const statements = (await readFile(resolve(release, file), 'utf8'))
      .split('--> statement-breakpoint')
      .map((statement) =>
        statement
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter(Boolean)
    for (let offset = 0; offset < statements.length; offset += 50)
      await database.batch(
        statements
          .slice(offset, offset + 50)
          .map((statement) => database.prepare(statement)),
      )
  }
  const health = await dispatch('/api/health')
  assert.equal(health.status, 200)
  assert.equal(health.headers.get('X-Roastbook-Revision'), manifest.revision)
  const login = await dispatch('/login')
  assert.equal(login.status, 200)
  assert((await login.text()).includes('email'))
  assert.equal(
    (await dispatch('/', { headers: { accept: 'text/html' } })).status,
    303,
  )
  assert.equal((await rpc()).status, 401)
  assert.equal((await dispatch('/media/beans/1/missing.webp')).status, 401)
  assert.equal(
    (await runtime.dispatchFetch('https://wrong.example.test/api/health'))
      .status,
    421,
  )
  console.log(
    'PASS release modules, migrated health, revision, login SSR, canonical origin and private routes',
  )

  const userId = 'release-oauth-user'
  await database
    .prepare(
      'insert into auth_users(id,email,email_verified,journal_initialized_at) values (?,?,1,?)',
    )
    .bind(userId, 'release-oauth@example.test', Date.now())
    .run()
  const token = randomBytes(32).toString('base64url')
  await database
    .prepare(
      'insert into auth_sessions(id,user_id,token,expires_at) values (?,?,?,?)',
    )
    .bind(randomUUID(), userId, token, Date.now() + 3600000)
    .run()
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  const cookie = `__Secure-roastbook.session_token=${encodeURIComponent(`${token}.${signature}`)}`
  const session = await json(
    await dispatch('/api/auth/get-session', { headers: { cookie } }),
  )
  assert.equal(session.user?.id, userId)
  const { client_id: client } = await json(
    await api('/oauth2/register', {
      client_name: 'Workers release verification',
      redirect_uris: ['http://127.0.0.1:19191/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'mcp:read mcp:write offline_access',
    }),
  )
  assert.equal(typeof client, 'string')
  async function authorize() {
    const verifier = randomBytes(32).toString('base64url')
    const query = new URLSearchParams({
      client_id: client,
      redirect_uri: 'http://127.0.0.1:19191/callback',
      response_type: 'code',
      scope: 'mcp:read offline_access',
      resource,
      state: randomUUID(),
      prompt: 'consent',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    })
    const response = await dispatch(`/api/auth/oauth2/authorize?${query}`, {
      headers: { cookie },
    })
    let redirectUrl
    if (response.status === 302) redirectUrl = response.headers.get('location')
    else {
      const redirect = await json(response)
      assert.equal(redirect.redirect, true)
      redirectUrl = redirect.url
    }
    const consent = new URL(redirectUrl ?? '', origin)
    assert.equal(consent.pathname, '/oauth/consent')
    const decision = await json(
      await api(
        '/oauth2/consent',
        { accept: true, oauth_query: consent.search.slice(1) },
        cookie,
      ),
    )
    const code = new URL(decision.url).searchParams.get('code')
    assert(code)
    return { code, verifier }
  }
  const exchange = ({ code, verifier }) =>
    api('/oauth2/token', {
      grant_type: 'authorization_code',
      client_id: client,
      redirect_uri: 'http://127.0.0.1:19191/callback',
      code,
      code_verifier: verifier,
      resource,
    })
  const refresh = (refreshToken) =>
    api('/oauth2/token', {
      grant_type: 'refresh_token',
      client_id: client,
      refresh_token: refreshToken,
      resource,
    })
  const authorization = await authorize()
  const exchanges = await Promise.all([
    exchange(authorization),
    exchange(authorization),
  ])
  assert.deepEqual(
    exchanges.map((response) => response.status).sort(),
    [200, 400],
  )
  const issued = await json(exchanges.find((response) => response.ok))
  assert(issued.access_token && issued.refresh_token)
  assert.equal((await rpc(issued.access_token)).status, 200)
  console.log(
    'PASS OAuth PKCE code exchange across the real Durable Object consumes one code once',
  )

  // Better Auth revokes the refresh family when an authorization code is
  // replayed. Exercise rotation on a fresh authorization after that check.
  assert.equal((await refresh(issued.refresh_token)).status, 400)
  const rotationTokens = await json(await exchange(await authorize()))
  const rotations = await Promise.all([
    refresh(rotationTokens.refresh_token),
    refresh(rotationTokens.refresh_token),
  ])
  if (!rotations.some((response) => response.ok))
    console.error(
      await Promise.all(rotations.map((response) => response.clone().text())),
    )
  assert.deepEqual(
    rotations.map((response) => response.status).sort(),
    [200, 400],
  )
  console.log('PASS simultaneous refresh rotation has exactly one winner')
  const badPkce = await authorize()
  assert.equal(
    (
      await exchange({
        ...badPkce,
        verifier: randomBytes(32).toString('base64url'),
      })
    ).status,
    400,
  )

  const raceTokens = await json(await exchange(await authorize()))
  const grant = await database
    .prepare('select id from oauth_consent where user_id=? and client_id=?')
    .bind(userId, client)
    .first()
  assert(grant)
  const namespace = await runtime.getDurableObjectNamespace('OAUTH_COORDINATOR')
  const coordinator = namespace.get(namespace.idFromName(client))
  const [racingRefresh, disconnect] = await Promise.all([
    refresh(raceTokens.refresh_token),
    coordinator.fetch('https://oauth-coordinator.internal/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: client, userId, id: grant.id }),
    }),
  ])
  assert.equal(disconnect.status, 204)
  assert([200, 400].includes(racingRefresh.status))
  const minted = racingRefresh.ok ? await racingRefresh.json() : null
  for (const access of [
    issued.access_token,
    raceTokens.access_token,
    minted?.access_token,
  ].filter(Boolean))
    assert.equal((await rpc(access)).status, 401)
  assert.equal((await refresh(raceTokens.refresh_token)).status, 400)
  console.log(
    'PASS disconnect serializes against refresh and invalidates every old grant token',
  )
  const reconnected = await json(await exchange(await authorize()))
  assert.equal((await rpc(reconnected.access_token)).status, 200)
  assert.equal((await rpc(raceTokens.access_token)).status, 401)
  if (minted?.access_token)
    assert.equal((await rpc(minted.access_token)).status, 401)
  await database
    .prepare('update oauth_client set disabled=1 where client_id=?')
    .bind(client)
    .run()
  assert.equal((await rpc(reconnected.access_token)).status, 401)
  console.log(
    'PASS reconnect accepts new tokens, rejects old tokens, and rechecks disabled clients',
  )
} finally {
  await runtime.dispose()
}
