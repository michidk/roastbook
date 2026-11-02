import '@tanstack/react-start/server-only'
import { expireAccountExports, runAccountJob } from './auth/jobs.server'

export async function runScheduledJobs() {
  await expireAccountExports()
  // One claim bounds the total D1/R2 subrequests for this cron invocation.
  await runAccountJob()
}
