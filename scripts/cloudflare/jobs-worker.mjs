import {
  expireAccountExports,
  runAccountJob,
} from '../../src/cloudflare/auth/jobs.server'
import { withCloudflareRuntime } from '../../src/cloudflare/context.server'
export default {
  async fetch(request, env) {
    return withCloudflareRuntime(env, async () => {
      const step = new URL(request.url).pathname
      if (step === '/export') {
        const claimed = await Promise.all(
          Array.from({ length: 6 }, () => runAccountJob()),
        )
        const jobs = await env.DB.prepare(
          'select id,user_id,status,storage_path,attempts from account_jobs order by id',
        ).all()
        return Response.json({
          claimed: claimed.filter(Boolean).length,
          jobs: jobs.results,
        })
      }
      if (step === '/stale') {
        const running = runAccountJob()
        let seen = false
        for (let attempt = 0; attempt < 100; attempt++) {
          const current = await env.DB.prepare(
            "select status from account_jobs where id='stale-export'",
          ).first()
          if (current?.status === 'running') {
            await env.DB.prepare(
              "update account_jobs set attempts=attempts+1,available_at=? where id='stale-export'",
            )
              .bind(Date.now() + 120000)
              .run()
            seen = true
            break
          }
        }
        await running
        return Response.json({
          seen,
          job: await env.DB.prepare(
            "select status,storage_path,attempts from account_jobs where id='stale-export'",
          ).first(),
        })
      }
      if (step === '/deleting') {
        const running = runAccountJob()
        let seen = false
        for (let attempt = 0; attempt < 100; attempt++) {
          const current = await env.DB.prepare(
            "select status from account_jobs where id='race-export'",
          ).first()
          if (current?.status === 'running') {
            await env.DB.prepare(
              "update auth_users set deleting_at=? where id='alice'",
            )
              .bind(Date.now())
              .run()
            seen = true
            break
          }
        }
        await running
        return Response.json({
          seen,
          job: await env.DB.prepare(
            "select status,storage_path from account_jobs where id='race-export'",
          ).first(),
        })
      }
      if (step === '/delete') {
        for (let i = 0; i < 10; i++) if (!(await runAccountJob())) break
        return Response.json({
          user: await env.DB.prepare(
            "select id from auth_users where id='alice'",
          ).first(),
          remaining: (
            await env.DB.prepare(
              "select count(*) n from bean_images where owner_id='alice'",
            ).first()
          ).n,
          bob: (
            await env.DB.prepare(
              "select count(*) n from beans where owner_id='bob'",
            ).first()
          ).n,
          job: await env.DB.prepare(
            "select status from account_jobs where kind='delete'",
          ).first(),
        })
      }
      if (step === '/expire') {
        await expireAccountExports()
        return new Response('ok')
      }
      return new Response('bad path', { status: 404 })
    })
  },
}
