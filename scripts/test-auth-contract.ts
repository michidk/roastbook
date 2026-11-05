import assert from 'node:assert/strict'
import { startAuthEmailFixture } from './auth-smtp-fixture'

assert(process.env.TEST_DATABASE_URL, 'An isolated test database is required')
const mail = await startAuthEmailFixture()
process.env.NODE_ENV = 'production'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.AUTH_ENABLED = 'true'
process.env.AUTH_SIGNUP_ENABLED = 'true'
process.env.DEPLOYMENT_MODE = 'hosted'
process.env.AUTH_SECRET = 'auth-contract-test-secret-at-least-32-characters'
process.env.PUBLIC_URL = 'https://app.example.test'
process.env.AUTH_ADMIN_EMAIL = 'operator@example.test'
process.env.EMAIL_PROVIDER = 'smtp'
process.env.EMAIL_FROM = 'roastbook@example.test'
process.env.SMTP_URL = mail.url
try {
  const { verifyAuthContract } = await import('./auth-contract')
  await verifyAuthContract(mail.readMessages)
  console.log('PASS PostgreSQL shared authentication contract')
} finally {
  await mail.close()
  const { getControlDb, getJournalDb } = await import(
    '../src/db/connection.server'
  )
  await Promise.all([
    getControlDb().$client.end(),
    getJournalDb().$client.end(),
  ])
}
