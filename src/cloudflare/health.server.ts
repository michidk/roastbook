import { createServerOnlyFn } from '@tanstack/react-start'
import { requireCloudflareRuntime } from './context.server'
export const probeDatabase = createServerOnlyFn(async () => {
  const row = await requireCloudflareRuntime()
    .bindings.DB.prepare('select 1 as ready')
    .first<{ ready: number }>()
  if (row?.ready !== 1) throw new Error('Database is unavailable')
})
