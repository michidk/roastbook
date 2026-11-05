import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  startAiAccounting,
  updateAiAccounting,
} from '@/cloudflare/ai-request-accounting.server'
import {
  changeUserRole,
  confirmAccountDeletion,
  removeUser,
  requestAccountExport,
} from '@/cloudflare/auth/account.server'
import { initializeUser } from '@/cloudflare/auth/identity.server'
import { createIntegrationToken } from '@/cloudflare/auth/integrations.server'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { withCloudflareRuntime } from '@/cloudflare/context.server'
import { createAuthDatabaseAdapter } from '@/db/d1/auth-database-adapter.server'
import {
  type JournalIdentity,
  withJournal,
} from '@/db/d1/journal-context.server'

function identity(id: string): JournalIdentity {
  return {
    id,
    email: `${id}@example.test`,
    role: id.startsWith('verify-admin') ? 'admin' : 'user',
    authentication: true,
    authenticatedAt: new Date(),
  }
}
function successes<T>(results: PromiseSettledResult<T>[]): T[] {
  return results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  )
}

export async function verifyAccounts(
  bindings: CloudflareRuntimeBindings,
): Promise<void> {
  const database = bindings.DB
  await withCloudflareRuntime(
    {
      ...bindings,
      AUTH_ENABLED: 'true',
      DEPLOYMENT_MODE: 'hosted',
      AUTH_ADMIN_EMAIL: 'verify-operator@example.test',
      AI_PROVIDED_API_KEY: 'disposable-test-provider-key',
      AI_PROVIDED_VISION_MODEL: 'test-model',
      AI_PROVIDED_RESEARCH_MODEL: 'test-model',
    },
    async () => {
      for (const id of [
        'verify-admin-a',
        'verify-admin-b',
        'verify-alice',
        'verify-bob',
      ])
        await database
          .prepare(
            'insert into auth_users(id,email,email_verified,role) values (?,?,1,?)',
          )
          .bind(id, identity(id).email, identity(id).role)
          .run()
      await Promise.all(
        Array.from({ length: 10 }, () =>
          initializeUser({
            id: 'verify-alice',
            email: identity('verify-alice').email,
            emailVerified: true,
          }),
        ),
      )
      assert.equal(
        (
          await database
            .prepare(
              "select count(*) as n from drink_types where owner_id='verify-alice'",
            )
            .first<{ n: number }>()
        )?.n,
        16,
      )
      assert.equal(
        (
          await database
            .prepare(
              "select count(*) as n from settings where owner_id='verify-alice' and id=1",
            )
            .first<{ n: number }>()
        )?.n,
        1,
      )

      const demotions = await Promise.allSettled(
        ['verify-admin-a', 'verify-admin-b'].map((id) =>
          withJournal(identity(id), () => changeUserRole(id, 'user')),
        ),
      )
      assert.equal(
        successes(demotions).length,
        1,
        'simultaneous demotions must retain the last administrator',
      )
      const demoted = await database
        .prepare(
          "select id from auth_users where id like 'verify-admin-%' and role='user'",
        )
        .first<{ id: string }>()
      assert(demoted)
      await assert.rejects(
        withJournal(identity(demoted.id), () =>
          changeUserRole('verify-alice', 'admin'),
        ),
        'a stale admin identity must be rechecked inside its write batch',
      )
      const admin = await database
        .prepare(
          "select id from auth_users where id like 'verify-admin-%' and role='admin'",
        )
        .first<{ id: string }>()
      assert(admin)
      await assert.rejects(
        withJournal(identity(admin.id), () => removeUser(admin.id)),
      )

      const exports = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          withJournal(identity('verify-alice'), requestAccountExport),
        ),
      )
      assert.equal(
        successes(exports).length,
        1,
        'only one export may be requested per hour',
      )
      const tokens = await Promise.allSettled(
        Array.from({ length: 15 }, () =>
          withJournal(identity('verify-alice'), () =>
            createIntegrationToken('mcp', 'verification'),
          ),
        ),
      )
      assert.equal(
        successes(tokens).length,
        10,
        'credential cap must survive concurrent requests',
      )

      const adapter = createAuthDatabaseAdapter()({})
      await adapter.create({
        model: 'verification',
        data: {
          identifier: 'verify-single-use',
          value: 'opaque-challenge',
          expiresAt: new Date(Date.now() + 60000),
        },
      })
      const consumed = await Promise.all(
        Array.from({ length: 15 }, () =>
          adapter.consumeOne({
            model: 'verification',
            where: [{ field: 'identifier', value: 'verify-single-use' }],
          }),
        ),
      )
      assert.equal(
        consumed.filter(Boolean).length,
        1,
        'Better Auth verification must be consumed atomically',
      )

      await database
        .prepare(
          "insert into ai_request_logs(id,owner_id,provider_mode,request_type,model,request_payload) values (999999,'verify-alice','byo','verification','test-model','{}')",
        )
        .run()
      await assert.rejects(
        withJournal(identity('verify-alice'), () =>
          startAiAccounting({
            id: 999999,
            ownerId: 'verify-alice',
            providerMode: 'provided',
            requestType: 'verification',
            model: 'test-model',
            requestPayload: {},
          }),
        ),
      )
      assert.equal(
        await database
          .prepare("select 1 from ai_weekly_usage where user_id='verify-alice'")
          .first(),
        null,
        'failed log insert must roll back the allowance reservation',
      )
      const requests = await Promise.allSettled(
        Array.from({ length: 30 }, () =>
          withJournal(identity('verify-alice'), () =>
            startAiAccounting({
              ownerId: 'verify-alice',
              providerMode: 'provided',
              requestType: 'verification',
              model: 'test-model',
              requestPayload: {},
            }),
          ),
        ),
      )
      const logIds = successes(requests)
      assert.equal(
        logIds.length,
        10,
        'weekly free quota must survive concurrent reservations',
      )
      const [logId] = logIds
      assert(logId)
      await withJournal(identity('verify-bob'), () =>
        updateAiAccounting(logId, { status: 'succeeded' }),
      )
      assert.equal(
        (
          await database
            .prepare('select status from ai_request_logs where id=?')
            .bind(logId)
            .first<{ status: string }>()
        )?.status,
        'in_progress',
        'log completion must be owner scoped',
      )

      const token = 'verify-deletion-challenge'
      await database
        .prepare(
          "insert into auth_verifications(id,identifier,value,expires_at) values ('verify-delete','delete:verify-bob',?,?)",
        )
        .bind(
          createHash('sha256').update(token).digest('hex'),
          Date.now() + 600000,
        )
        .run()
      const deletions = await Promise.allSettled(
        Array.from({ length: 2 }, () =>
          withJournal(identity('verify-bob'), () =>
            confirmAccountDeletion(token),
          ),
        ),
      )
      assert.equal(
        successes(deletions).length,
        1,
        'deletion confirmation must be consumed once',
      )
    },
  )
}
