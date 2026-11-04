import { expect, test } from 'bun:test'
import { parseServerEnv } from '@/lib/env.server'
import { isAdminEmail, mayRegister } from './registration.server'

const base = {
  DATABASE_URL: 'postgres://roastbook:roastbook@localhost/roastbook',
  AUTH_ADMIN_EMAIL: 'owner@example.test',
  AUTH_ALLOWED_EMAILS: 'friend@example.test',
}

test('closed signup admits only admins and allowed addresses', () => {
  const env = parseServerEnv(base)
  expect(mayRegister(env, 'Owner@example.test')).toBe(true)
  expect(mayRegister(env, 'friend@example.test')).toBe(true)
  expect(mayRegister(env, 'stranger@example.test')).toBe(false)
  expect(isAdminEmail(env, 'friend@example.test')).toBe(false)
})

test('open signup admits everyone', () => {
  const env = parseServerEnv({ ...base, AUTH_SIGNUP_ENABLED: 'true' })
  expect(mayRegister(env, 'stranger@example.test')).toBe(true)
})
