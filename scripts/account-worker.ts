import {
  expireAccountExports,
  runAccountJob,
} from '../src/lib/server/auth/jobs.server'

let stopped = false
process.on('SIGTERM', () => {
  stopped = true
})
process.on('SIGINT', () => {
  stopped = true
})
while (!stopped) {
  try {
    await expireAccountExports()
    if (await runAccountJob()) continue
  } catch (error) {
    console.error(
      'Account worker failed',
      error instanceof Error ? error.message : 'Unknown error',
    )
  }
  await new Promise((resolve) => setTimeout(resolve, 5000))
}
process.exit(0)
