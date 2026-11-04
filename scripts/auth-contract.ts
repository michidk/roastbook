import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { authSessions, authUsers, authVerifications } from '@/db/schema'
import { signUpPolicy } from '@/extension-points/sign-up.server'
import { getServerEnv } from '@/lib/env.server'
import {
  changeUserRole,
  confirmAccountDeletion,
  listUsers,
  requestAccountDeletion,
} from '@/lib/server/auth/account.server'
import { handleJournalRequest } from '@/lib/server/auth/request.server'

const resolvedLink = z.object({ email: z.email(), code: z.string() })
const sessionBody = z.object({ id: z.string(), authenticatedAt: z.string() })
type Message = { to: string; text: string }

/** The same HTTP and domain contract runs against both real database adapters. */
export async function verifyAuthContract(
  readMessages: () => Promise<Message[]>,
) {
  const origin = new URL(getServerEnv().AUTH_URL ?? '').origin
  const database = getControlDb()
  const prefix = `contract-${randomUUID()}`
  const address = (name: string) => `${prefix}-${name}@example.test`
  const adminEmail = address('admin')
  const userEmail = address('user')
  const expiredEmail = address('expired')
  const attemptsEmail = address('attempts')
  const flowA = address('flow-a')
  const flowB = address('flow-b')
  const termsEmail = address('terms')
  const policy = signUpPolicy()
  const emails = [
    termsEmail,
    adminEmail,
    userEmail,
    expiredEmail,
    attemptsEmail,
    flowA,
    flowB,
  ]
  let ip = 0
  async function dispatch(
    path: string,
    body?: object,
    cookie?: string,
    action: () => Promise<Response> = async () => {
      const identity = requireIdentity()
      return Response.json(
        {
          id: identity.id,
          authenticatedAt: identity.authenticatedAt,
        },
        { headers: { 'Set-Cookie': 'downstream=preserved; Path=/; HttpOnly' } },
      )
    },
    headers?: HeadersInit,
  ) {
    const requestHeaders = new Headers(headers)
    requestHeaders.set(
      getServerEnv().AUTH_IP_HEADER,
      `198.51.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`,
    )
    if (cookie) requestHeaders.set('Cookie', cookie)
    if (body) {
      if (!requestHeaders.has('Origin')) requestHeaders.set('Origin', origin)
      requestHeaders.set('Content-Type', 'application/json')
    }
    return handleJournalRequest(
      new Request(new URL(path, origin), {
        method: body ? 'POST' : 'GET',
        headers: requestHeaders,
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      action,
    )
  }
  function api(endpoint: string, body?: object, cookie?: string) {
    return dispatch(`/api/auth${endpoint}`, body, cookie)
  }
  async function credentials(email: string, query?: string) {
    const response = await api('/email-otp/send-verification-otp', {
      email,
      type: 'sign-in',
      ...(query ? { oauth_query: query } : {}),
    })
    assert.equal(response.status, 200, await response.text())
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
    const message = (await readMessages())
      .slice()
      .reverse()
      .find((item) => item.to === email)
    assert(message, 'a real delivery must reach the test email service')
    const link = new URL(
      /https?:\/\/[^\s]+\/login[^\s]*/.exec(message.text)?.[0] ?? '',
    )
    assert(!link.href.includes(email))
    const token = new URLSearchParams(link.hash.slice(1)).get('sign-in')
    assert(token)
    const resolved = await api('/email-otp/resolve-sign-in-link', { token })
    assert.equal(resolved.status, 200)
    return { ...resolvedLink.parse(await resolved.json()), link }
  }
  async function check(email: string, otp: string) {
    const response = await api('/email-otp/check-verification-otp', {
      email,
      type: 'sign-in',
      otp,
    })
    return {
      status: response.status,
      code: (await response.json().catch(() => ({}))).code as unknown,
    }
  }
  async function login(email: string) {
    const { code } = await credentials(email)
    const wrong = await check(
      email,
      code === '00000000' ? '11111111' : '00000000',
    )
    assert.notEqual(
      wrong.code,
      'USER_NOT_FOUND',
      'a wrong code must not reveal whether an account exists',
    )
    const existing = await check(email, code)
    const created = existing.code === 'USER_NOT_FOUND'
    assert(created || existing.status === 200, JSON.stringify(existing))
    const response = await api('/sign-in/email-otp', {
      email,
      otp: code,
      // The confirmation step sends the consents with the creating sign-in.
      ...(created
        ? {
            termsVersion: policy.termsVersion ?? undefined,
            newsletterOptIn: true,
          }
        : {}),
    })
    assert.equal(response.status, 200, await response.clone().text())
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
    assert(cookie.includes('roastbook.session_token'))
    assert(
      response.headers.getSetCookie().some((value) => /HttpOnly/i.test(value)),
    )
    const [user] = await database
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
    assert(user)
    if (created) {
      assert.equal(user.termsVersion ?? null, policy.termsVersion)
      assert.equal(Boolean(user.termsAcceptedAt), Boolean(policy.termsVersion))
      assert.equal(user.newsletterOptIn, policy.newsletter)
    }
    return { cookie, user, code }
  }
  function signedQuery(
    state: string,
    exp = Math.floor(Date.now() / 1000) + 600,
  ) {
    const params = new URLSearchParams({
      client_id: 'contract-client',
      state,
      exp: String(exp),
    })
    params.sort()
    const sig = createHmac('sha256', getServerEnv().AUTH_SECRET ?? '')
      .update(params.toString())
      .digest('base64')
    params.set('sig', sig)
    return params.toString()
  }
  try {
    if (policy.termsVersion) {
      for (const termsVersion of [undefined, 'outdated-version']) {
        const { code } = await credentials(termsEmail)
        const refused = await api('/sign-in/email-otp', {
          email: termsEmail,
          otp: code,
          termsVersion,
        })
        assert.equal(refused.status, 400, 'accounts require the current terms')
      }
      assert.equal(
        (
          await database
            .select()
            .from(authUsers)
            .where(eq(authUsers.email, termsEmail))
        ).length,
        0,
      )
    }
    const admin = await login(adminEmail)
    const user = await login(userEmail)
    await database
      .update(authUsers)
      .set({ role: 'admin' })
      .where(eq(authUsers.id, admin.user.id))
    const reused = await api('/sign-in/email-otp', {
      email: userEmail,
      otp: user.code,
    })
    assert.equal(reused.status, 400, 'a successful OTP must be consumed')

    const expired = await credentials(expiredEmail)
    await database
      .update(authVerifications)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(authVerifications.identifier, `sign-in-otp-${expiredEmail}`))
    assert.equal(
      (
        await api('/sign-in/email-otp', {
          email: expiredEmail,
          otp: expired.code,
        })
      ).status,
      400,
    )
    const attempts = await credentials(attemptsEmail)
    for (let i = 0; i < 3; i++)
      assert.equal(
        (
          await api('/sign-in/email-otp', {
            email: attemptsEmail,
            otp: attempts.code === '00000000' ? '11111111' : '00000000',
          })
        ).status,
        400,
      )
    assert.equal(
      (
        await api('/sign-in/email-otp', {
          email: attemptsEmail,
          otp: attempts.code,
        })
      ).status,
      403,
    )

    const forgedOrigin = await dispatch(
      '/api/auth/email-otp/send-verification-otp',
      { email: flowA, type: 'sign-in' },
      undefined,
      undefined,
      { Origin: 'https://attacker.example.test' },
    )
    assert.equal(
      forgedOrigin.status,
      403,
      'the HTTP adapter must retain Better Auth CSRF checks',
    )

    const queries = [signedQuery('flow-a'), signedQuery('flow-b')]
    const links = await Promise.all([
      credentials(flowA, queries[0]),
      credentials(flowB, queries[1]),
    ])
    links.forEach((result, i) => {
      assert.equal(
        result.link.search.slice(1),
        queries[i],
        'explicit continuation must survive without Referer and remain request scoped',
      )
    })
    for (const query of [signedQuery('old', 1), `${queries[0]}x`])
      assert.equal(
        (
          await api('/email-otp/send-verification-otp', {
            email: flowA,
            type: 'sign-in',
            oauth_query: query,
          })
        ).status,
        400,
      )
    const noContinuation = await dispatch(
      '/api/auth/email-otp/send-verification-otp',
      { email: flowA, type: 'sign-in' },
      undefined,
      undefined,
      { Referer: `${origin}/login?${queries[0]}` },
    )
    assert.equal(noContinuation.status, 200)
    const latest = (await readMessages())
      .slice()
      .reverse()
      .find((message) => message.to === flowA)
    assert(
      latest && !latest.text.includes('client_id='),
      'Referer must never supply a continuation',
    )

    const revoked = await login(flowB)
    assert.equal((await api('/sign-out', {}, revoked.cookie)).status, 200)
    const revokedRequest = await dispatch('/private', undefined, revoked.cookie)
    assert.equal(revokedRequest.status, 401)
    assert(
      revokedRequest.headers
        .getSetCookie()
        .some((cookie) => /Max-Age=0/i.test(cookie)),
    )
    assert.equal(
      (
        await database
          .select()
          .from(authSessions)
          .where(eq(authSessions.userId, revoked.user.id))
      ).length,
      0,
    )

    const oldCreatedAt = new Date(Date.now() - 2 * 86400_000)
    await database
      .update(authSessions)
      .set({
        createdAt: oldCreatedAt,
        updatedAt: oldCreatedAt,
        expiresAt: new Date(Date.now() + 27 * 86400_000),
      })
      .where(eq(authSessions.userId, admin.user.id))
    const renewed = await dispatch('/private', undefined, admin.cookie)
    assert.equal(renewed.status, 200)
    const identity = sessionBody.parse(await renewed.json())
    assert.equal(
      new Date(identity.authenticatedAt).getTime(),
      oldCreatedAt.getTime(),
    )
    const cookies = renewed.headers.getSetCookie()
    assert(cookies.some((value) => value.startsWith('downstream=')))
    assert(
      cookies.some(
        (value) =>
          value.includes('roastbook.session_token') &&
          /Max-Age=2592000/i.test(value),
      ),
      'normal private responses must forward renewed session cookies',
    )
    const [session] = await database
      .select()
      .from(authSessions)
      .where(eq(authSessions.userId, admin.user.id))
    assert(session && session.expiresAt.getTime() > Date.now() + 29 * 86400_000)

    const domain = (cookie: string, run: () => Promise<unknown>) =>
      dispatch('/private/action', {}, cookie, async () => {
        await run()
        return new Response(null, { status: 204 })
      })
    await assert.rejects(
      domain(user.cookie, () => listUsers(0)),
      /Administrator/,
    )
    await assert.rejects(
      domain(admin.cookie, () => changeUserRole(user.user.id, 'admin')),
      /Sign in again/,
    )
    await database
      .update(authSessions)
      .set({ createdAt: new Date() })
      .where(eq(authSessions.userId, admin.user.id))
    assert.equal(
      (await domain(admin.cookie, () => changeUserRole(user.user.id, 'admin')))
        .status,
      204,
    )
    assert.equal(
      (await domain(admin.cookie, () => changeUserRole(user.user.id, 'user')))
        .status,
      204,
    )
    await assert.rejects(
      domain(user.cookie, () => listUsers(0)),
      /Administrator/,
    )

    assert.equal(
      (await domain(user.cookie, requestAccountDeletion)).status,
      204,
    )
    const deletion = (await readMessages())
      .slice()
      .reverse()
      .find((message) => message.to === userEmail)
    assert(deletion)
    const deletionToken = /#delete=([A-Za-z0-9_-]+)/.exec(deletion.text)?.[1]
    assert(deletionToken)
    await assert.rejects(
      domain(admin.cookie, () => confirmAccountDeletion(deletionToken)),
    )
    assert.equal(
      (await domain(user.cookie, () => confirmAccountDeletion(deletionToken)))
        .status,
      204,
    )
    assert.equal(
      (await dispatch('/private', undefined, user.cookie)).status,
      401,
    )
    assert.equal(
      (await api('/sign-in/email-otp', { email: userEmail, otp: user.code }))
        .status,
      400,
    )
    await database
      .update(authSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(authSessions.userId, admin.user.id))
    const invalid = await dispatch('/private', undefined, admin.cookie)
    assert.equal(invalid.status, 401)
    assert(
      invalid.headers
        .getSetCookie()
        .some((cookie) => /Max-Age=0/i.test(cookie)),
      'expired sessions must clear the browser cookie',
    )
    const redirect = await dispatch(
      '/private',
      undefined,
      admin.cookie,
      undefined,
      { accept: 'text/html' },
    )
    assert.equal(redirect.status, 303)
    assert(
      redirect.headers
        .getSetCookie()
        .some((cookie) => /Max-Age=0/i.test(cookie)),
    )
    assert.equal((await api('/update-user', {})).status, 404)
    assert.equal((await api('/sign-up/email', {})).status, 404)
  } finally {
    await database.delete(authUsers).where(inArray(authUsers.email, emails))
  }
}
