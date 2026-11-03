import '@tanstack/react-start/server-only'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { emailOTP } from 'better-auth/plugins'
import { and, eq, isNull } from 'drizzle-orm'
import { getCloudflareRuntime } from '@/cloudflare/context.server'
import { getControlDb } from '@/db/connection.server'
import { authUsers, instanceIdentity } from '@/db/schema'
import { renderAccountEmail } from '@/lib/account-email'
import { getServerEnv } from '@/lib/env.server'
import { createAuthDatabaseAdapter } from '@/lib/server/auth/database-adapter.server'
import { sendAccountEmail } from '@/lib/server/auth/email.server'
import { initializeUser } from '@/lib/server/auth/identity.server'
import {
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_LIFETIME_MS,
} from '@/modules/auth/sign-in-link'
import { allowEmailAttempt } from './email-rate-limit.server'
import { getEmailSignInOAuthQuery } from './email-sign-in-flow.server'
import { mcpAuthPlugins } from './mcp-options.server'
import { requirePasskeyUserVerification } from './passkey-policy.server'
import {
  createSignInLinkToken,
  emailSignInLinkPlugin,
} from './sign-in-link.server'

function createAuth() {
  const env = getServerEnv()
  if (!env.AUTH_ENABLED || !env.AUTH_URL || !env.AUTH_SECRET)
    throw new Error('Authentication is disabled or incomplete')
  const origin = new URL(env.AUTH_URL).origin
  const secret = env.AUTH_SECRET
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
            renderAccountEmail({ kind: 'change-email', newEmail, url }),
          )
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendAccountEmail(
          user.email,
          renderAccountEmail({ kind: 'verify-email', url }),
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
        '/email-otp/resolve-sign-in-link': { window: 60, max: 20 },
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
      emailSignInLinkPlugin({ origin, secret }),
      emailOTP({
        otpLength: SIGN_IN_CODE_LENGTH,
        expiresIn: SIGN_IN_LIFETIME_MS / 1000,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== 'sign-in')
            throw new Error('This verification flow is unavailable')
          const url = new URL('/login', origin)
          const query = getEmailSignInOAuthQuery()
          if (query) url.search = query
          const token = await createSignInLinkToken({
            origin,
            secret,
            email,
            code: otp,
            sentAt: Date.now(),
          })
          url.hash = new URLSearchParams({ 'sign-in': token }).toString()
          await sendAccountEmail(
            email,
            renderAccountEmail({ kind: 'sign-in', url: url.href, code: otp }),
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
