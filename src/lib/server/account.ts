import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  changeUserAiLimit,
  changeUserRole,
  confirmAccountDeletion,
  getAccountState,
  issueToken,
  listIntegrationTokens,
  listUsers,
  removeUser,
  requestAccountDeletion,
  requestAccountExport,
  revokeToken,
} from '@/lib/server/auth/account.server'

export const getCurrentAccount = createServerFn({ method: 'GET' }).handler(
  getAccountState,
)
export const getUsers = createServerFn({ method: 'GET' })
  .validator(z.object({ page: z.number().int().min(0).max(10000).default(0) }))
  .handler(({ data }) => listUsers(data.page))
export const setUserRole = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string().min(1).max(128),
      role: z.enum(['user', 'admin']),
    }),
  )
  .handler(({ data }) => changeUserRole(data.userId, data.role))
export const deleteUser = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string().min(1).max(128) }))
  .handler(({ data }) => removeUser(data.userId))
export const requestDeletion = createServerFn({ method: 'POST' }).handler(
  requestAccountDeletion,
)
export const confirmDeletion = createServerFn({ method: 'POST' })
  .validator(z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }))
  .handler(({ data }) => confirmAccountDeletion(data.token))
export const requestExport = createServerFn({ method: 'POST' }).handler(
  requestAccountExport,
)
export const createToken = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      kind: z.enum(['mcp', 'shottimer']),
      name: z.string().trim().min(1).max(80),
    }),
  )
  .handler(({ data }) => issueToken(data.kind, data.name))
export const deleteToken = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(({ data }) => revokeToken(data.id))

export const getIntegrationTokens = createServerFn({ method: 'GET' }).handler(
  listIntegrationTokens,
)

export const setUserAiLimit = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userId: z.string().min(1).max(128),
      limit: z.number().int().min(0).max(2147483647),
    }),
  )
  .handler(({ data }) => changeUserAiLimit(data.userId, data.limit))
