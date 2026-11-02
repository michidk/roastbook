import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'

const directory = await mkdtemp(resolve(tmpdir(), 'roastbook-jobs-check-'))
const script = resolve(directory, 'worker.mjs')
execFileSync(
  'bun',
  [
    'build',
    'scripts/cloudflare/jobs-worker.mjs',
    '--target=node',
    '--tsconfig-override=tsconfig.cloudflare.json',
    '--outfile',
    script,
  ],
  { stdio: 'pipe' },
)
const worker = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    rootPath: directory,
    scriptPath: script,
    compatibilityDate: '2026-11-02',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    r2Buckets: ['MEDIA'],
  }),
)
try {
  const db = await worker.getD1Database('DB'),
    bucket = await worker.getR2Bucket('MEDIA')
  for (const migration of (await readdir('drizzle-d1'))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => `drizzle-d1/${name}`)) {
    for (const statement of (await readFile(migration, 'utf8')).split(
      '--> statement-breakpoint',
    )) {
      const sql = statement
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim()
      if (sql) await db.prepare(sql).run()
    }
  }
  for (const id of ['alice', 'bob']) {
    await db
      .prepare('insert into auth_users(id,email,email_verified) values (?,?,1)')
      .bind(id, `${id}@example.test`)
      .run()
    await db
      .prepare('insert into beans(id,owner_id,name) values (?,?,?)')
      .bind(id === 'alice' ? 1 : 2, id, `coffee-${id}`)
      .run()
  }
  await db
    .prepare(
      "insert into ai_provider_credentials(user_id,base_url,api,vision_model,research_model,encrypted_api_key) values ('alice','https://api.example.com/v1','responses','model','model','SECRET_CREDENTIAL')",
    )
    .run()
  await db
    .prepare(
      "insert into bean_purchases(id,owner_id,bean_id) values (1,'alice',1),(2,'bob',2)",
    )
    .run()
  await db
    .prepare(
      "insert into bean_images(id,owner_id,bean_id,bean_purchase_id,storage_path) values (1,'alice',1,1,'beans/1/alice.webp'),(2,'bob',2,2,'beans/2/bob.webp')",
    )
    .run()
  for (const key of [
    'beans/1/alice.webp',
    'beans/1/alice.thumb.webp',
    'beans/1/alice.small.webp',
    'beans/2/bob.webp',
  ])
    await bucket.put(key, key)
  await db
    .prepare("insert into settings(owner_id,id) values ('alice',1),('bob',1)")
    .run()
  await db
    .prepare(
      "insert into account_jobs(id,user_id,kind,available_at) values ('export-job','alice','export',0)",
    )
    .run()
  const response = await worker.dispatchFetch('http://localhost/export')
  assert.equal(response.status, 200)
  const result = await response.json()
  console.log(JSON.stringify(result))
  assert.equal(result.claimed, 1)
  assert.equal(result.jobs[0].status, 'ready')
  assert.equal(result.jobs[0].attempts, 1)
  const archive = await bucket.get(result.jobs[0].storage_path)
  assert(archive)
  const bytes = Buffer.from(await archive.arrayBuffer())
  assert(!bytes.includes(Buffer.from('SECRET_CREDENTIAL')))
  assert(!bytes.includes(Buffer.from('coffee-bob')))
  assert(bytes.includes(Buffer.from('coffee-alice')))
  assert(bytes.includes(Buffer.from('alice.webp')))
  const zip = resolve(directory, 'export.zip')
  await import('node:fs/promises').then((fs) => fs.writeFile(zip, bytes))
  execFileSync('unzip', ['-t', zip], { stdio: 'pipe' })
  const settings = JSON.parse(
    execFileSync('unzip', ['-p', zip, 'data/settings.jsonl'], {
      encoding: 'utf8',
    }),
  )
  assert.equal(settings.background_grain_enabled, true)
  assert(Array.isArray(settings.taste_profile_fields))
  assert.equal(typeof settings.created_at, 'string')
  assert(!('owner_id' in settings))
  // Expiration removes archives before removing their authorization records.
  await db
    .prepare(
      "insert into auth_rate_limits(id,key,count,last_request) values ('expired-limit','expired',1,0),('fresh-limit','fresh',1,?)",
    )
    .bind(Date.now())
    .run()
  await db
    .prepare(
      "insert into auth_verifications(id,identifier,value,expires_at) values ('expired-verification','expired','secret',0),('fresh-verification','fresh','secret',?)",
    )
    .bind(Date.now() + 600000)
    .run()
  await db
    .prepare("update account_jobs set expires_at=0 where id='export-job'")
    .run()
  await worker.dispatchFetch('http://localhost/expire')
  assert.equal(await bucket.head(result.jobs[0].storage_path), null)
  assert.equal(
    await db
      .prepare("select id from account_jobs where id='export-job'")
      .first(),
    null,
  )

  assert.equal(
    await db
      .prepare("select id from auth_rate_limits where id='expired-limit'")
      .first(),
    null,
  )
  assert(
    await db
      .prepare("select id from auth_rate_limits where id='fresh-limit'")
      .first(),
  )
  assert.equal(
    await db
      .prepare(
        "select id from auth_verifications where id='expired-verification'",
      )
      .first(),
    null,
  )
  assert(
    await db
      .prepare(
        "select id from auth_verifications where id='fresh-verification'",
      )
      .first(),
  )
  // Force a lease takeover during actual D1 streaming; the obsolete attempt must not publish.
  for (let index = 3; index < 503; index++)
    await db
      .prepare("insert into beans(id,owner_id,name) values (?,'alice',?)")
      .bind(index, `extra-${index}`)
      .run()
  await db
    .prepare(
      "insert into account_jobs(id,user_id,kind,available_at) values ('stale-export','alice','export',0)",
    )
    .run()
  const responseFenced = await worker.dispatchFetch('http://localhost/stale')
  assert.equal(responseFenced.status, 200)
  const resultFenced = await responseFenced.json()
  assert(resultFenced.seen, 'export never became running')
  const fenced = resultFenced.job
  assert.equal(fenced.status, 'running')
  assert.equal(fenced.storage_path, null)
  assert.equal(fenced.attempts, 2)
  assert.equal(
    (await bucket.list({ prefix: 'account-exports/alice/stale-export/' }))
      .objects.length,
    0,
  )
  await db.prepare("delete from account_jobs where id='stale-export'").run()
  // A bounded export fails explicitly; no partial archive becomes downloadable.
  await db
    .prepare(
      "with recursive sequence(n) as (select 1000 union all select n+1 from sequence where n<6001) insert into beans(id,owner_id,name) select n,'alice','limit-'||n from sequence",
    )
    .run()
  await db
    .prepare(
      "insert into account_jobs(id,user_id,kind,available_at) values ('limit-export','alice','export',0)",
    )
    .run()
  const limitResponse = await worker.dispatchFetch('http://localhost/export')
  assert.equal(limitResponse.status, 200)
  const limited = await db
    .prepare(
      "select status,storage_path from account_jobs where id='limit-export'",
    )
    .first()
  assert.equal(limited.status, 'failed')
  assert.equal(limited.storage_path, null)
  assert.equal(
    (await bucket.list({ prefix: 'account-exports/alice/limit-export/' }))
      .objects.length,
    0,
  )
  await db.prepare("delete from account_jobs where id='limit-export'").run()
  await db
    .prepare("delete from beans where owner_id='alice' and id>=1000")
    .run()
  // 105 images require multiple bounded job executions.
  for (let i = 3; i < 108; i++) {
    const key = `beans/1/extra-${i}.webp`
    await db
      .prepare(
        "insert into bean_images(id,owner_id,bean_id,bean_purchase_id,storage_path) values (?,'alice',1,1,?)",
      )
      .bind(i, key)
      .run()
    await bucket.put(key, 'synthetic')
  }
  await db
    .prepare(
      "insert into account_jobs(id,user_id,kind,available_at) values ('race-export','alice','export',0)",
    )
    .run()
  const racing = await worker.dispatchFetch('http://localhost/deleting')
  assert.equal(racing.status, 200)
  const raced = await racing.json()
  assert(raced.seen)
  assert.notEqual(raced.job.status, 'ready')
  assert.equal(raced.job.storage_path, null)
  assert.equal(
    (await bucket.list({ prefix: 'account-exports/alice/race-export/' }))
      .objects.length,
    0,
  )
  await db
    .prepare(
      "insert into account_jobs(id,user_id,kind,available_at) values ('delete-job','alice','delete',0)",
    )
    .run()
  const deleted = await worker.dispatchFetch('http://localhost/delete')
  assert.equal(deleted.status, 200)
  const deletion = await deleted.json()
  console.log(JSON.stringify(deletion))
  assert.equal(deletion.user, null)
  assert.equal(deletion.remaining, 0)
  assert.equal(deletion.bob, 1)
  assert.equal(deletion.job, null)
  assert.equal(await bucket.head('beans/1/alice.webp'), null)
  assert(await bucket.head('beans/2/bob.webp'))
  assert.equal((await bucket.list()).objects.length, 1)
  console.log(
    'Actual workerd jobs passed: concurrent claims, stale-attempt fencing, owner isolation, valid streamed ZIP/JSONL, secret exclusion, size limits, expiration, paged deletion and media cleanup',
  )
} finally {
  await worker.dispose()
  await rm(directory, { recursive: true, force: true })
}
