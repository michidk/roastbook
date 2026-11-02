import '@tanstack/react-start/server-only'
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { emailOTP } from 'better-auth/plugins'
import { and, eq, isNull } from 'drizzle-orm'
import { getCloudflareRuntime } from '@/cloudflare/context.server'
import { getControlDb } from '@/db/connection.server'
import { authUsers, instanceIdentity } from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import { createAuthDatabaseAdapter } from '@/lib/server/auth/database-adapter.server'
import { sendAccountEmail } from '@/lib/server/auth/email.server'
import { initializeUser } from '@/lib/server/auth/identity.server'
import { allowEmailAttempt } from './email-rate-limit.server'
import { mcpAuthPlugins } from './mcp-options.server'
import { requirePasskeyUserVerification } from './passkey-policy.server'

function createAuth() {
  const env = getServerEnv()
  if (!env.AUTH_ENABLED || !env.AUTH_URL || !env.AUTH_SECRET)
    throw new Error('Authentication is disabled or incomplete')
  const origin = new URL(env.AUTH_URL).origin
  return betterAuth({
    appName: 'Roastbook',
    baseURL: origin,
    secret: env.AUTH_SECRET,
    trustedOrigins: [origin],
    database: createAuthDatabaseAdapter(),
    emailAndPassword: { enabled: false },
    disabledPaths: ['/token', '/update-user'],
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        role: { type: ['user', 'admin'], defaultValue: 'user', input: false },
        deletingAt: { type: 'date', required: false, input: false },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await sendAccountEmail(
            user.email,
            'Approve your Roastbook email change',
            `Approve changing your email to ${newEmail}:\n\n${url}\n\nIf you did not request this, ignore this email.`,
          )
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendAccountEmail(
          user.email,
          'Verify your Roastbook email',
          `Verify this email address:\n\n${url}`,
        )
      },
    },
    advanced: {
      cookiePrefix: 'roastbook',
      useSecureCookies: origin.startsWith('https://'),
      ipAddress: { ipAddressHeaders: [env.AUTH_IP_HEADER] },
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 3 },
        '/sign-in/email-otp': { window: 60, max: 5 },
        '/oauth2/register': { window: 3600, max: 10 },
        '/oauth2/authorize': { window: 60, max: 30 },
        '/oauth2/token': { window: 60, max: 30 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        try {
          requirePasskeyUserVerification(ctx.path, ctx.body)
        } catch {
          throw new APIError('BAD_REQUEST', {
            message: 'Passkey device verification is required',
          })
        }
        if (
          ctx.path !== '/email-otp/send-verification-otp' &&
          ctx.path !== '/sign-in/email-otp'
        )
          return
        if (
          ctx.path === '/email-otp/send-verification-otp' &&
          ctx.body?.type !== 'sign-in'
        )
          throw new APIError('BAD_REQUEST', {
            message: 'Only sign-in codes are supported',
          })
        if (typeof ctx.body?.email !== 'string') return
        const email = ctx.body.email.trim().toLowerCase()
        ctx.body.email = email
        if (
          !(await allowEmailAttempt(
            email,
            ctx.path === '/sign-in/email-otp' ? 'verify' : 'send',
          ))
        )
          throw new APIError('TOO_MANY_REQUESTS', {
            message: 'Too many attempts. Try again in ten minutes.',
          })
        if (env.AUTH_SIGNUP_ENABLED) return
        const [existing] = await getControlDb()
          .select({ id: authUsers.id })
          .from(authUsers)
          .where(and(eq(authUsers.email, email), isNull(authUsers.deletingAt)))
        const [instance] = await getControlDb()
          .select()
          .from(instanceIdentity)
          .where(eq(instanceIdentity.id, 1))
        if (
          !existing &&
          email !== env.AUTH_ADMIN_EMAIL &&
          !(
            env.DEPLOYMENT_MODE === 'self-hosted' &&
            !instance?.bootstrapCompletedAt
          )
        ) {
          if (ctx.path === '/email-otp/send-verification-otp')
            return ctx.json({ success: true })
          throw new APIError('BAD_REQUEST', {
            message: 'Invalid or expired code',
          })
        }
      }),
    },
    databaseHooks: {
      user: {
        create: { before: async (user) => ({ data: { ...user, name: '' } }) },
        update: { before: async (user) => ({ data: { ...user, name: '' } }) },
      },
      session: {
        create: {
          before: async (session) => {
            const [user] = await getControlDb()
              .select()
              .from(authUsers)
              .where(eq(authUsers.id, session.userId))
            if (!user?.emailVerified || user.deletingAt) return false
            await initializeUser(user)
            return { data: session }
          },
          after: async (session) => {
            await getControlDb()
              .update(authUsers)
              .set({ lastLoginAt: new Date() })
              .where(eq(authUsers.id, session.userId))
          },
        },
      },
    },
    plugins: [
      ...mcpAuthPlugins(origin),
      emailOTP({
        otpLength: 8,
        expiresIn: 600,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        sendVerificationOTP: async ({ email, otp, type }, ctx) => {
          if (type !== 'sign-in')
            throw new Error('This verification flow is unavailable')
          // A fragment never reaches the server or email scanner. The confirmation button
          // submits the same OTP as manual entry, so both choices consume one challenge.
          const url = new URL('/login', origin)
          // Email OTP validation strips plugin-only body fields. The same-origin
          // page referrer retains the signed query for a link opened in a new tab.
          const referrer = ctx?.headers?.get('referer')
          const page = referrer ? new URL(referrer, origin) : undefined
          const query =
            page?.origin === origin && page.pathname === '/login'
              ? page.search.slice(1)
              : undefined
          if (
            typeof query === 'string' &&
            (await verifyOAuthQueryParams(query, env.AUTH_SECRET ?? ''))
          )
            url.search = query
          url.hash = new URLSearchParams({ email, code: otp }).toString()
          await sendAccountEmail(
            email,
            'Sign in to Roastbook',
            `Your sign-in code is ${otp}.\n\nOr open this link and confirm sign-in:\n${url}\n\nThis code expires in 10 minutes. If you did not request it, ignore this email.`,
          )
        },
      }),
      passkey({
        rpID: new URL(origin).hostname,
        rpName: 'Roastbook',
        origin,
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
      }),
    ],
  })
}
let auth: ReturnType<typeof createAuth> | undefined
const runtimeAuth = new WeakMap<object, ReturnType<typeof createAuth>>()
export function getAuth() {
  const runtime = getCloudflareRuntime()
  if (runtime) {
    const cached = runtimeAuth.get(runtime.bindings)
    if (cached) return cached
    const created = createAuth()
    runtimeAuth.set(runtime.bindings, created)
    return created
  }
  auth ??= createAuth()
  return auth
}
