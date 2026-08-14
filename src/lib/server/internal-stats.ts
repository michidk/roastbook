import { createServerFn } from '@tanstack/react-start'
import { count, sql } from 'drizzle-orm'
import { db } from '@/db'
import { aiUsage } from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import { getStorage } from '@/lib/storage'

const FAVICON_PREFIX = 'favicons/'

type StorageStats = {
  readonly available: boolean
  readonly provider: 'local' | 's3'
  readonly imageCount: number | null
  readonly faviconCount: number | null
  readonly totalBytes: number | null
}

async function loadStorageStats(): Promise<StorageStats> {
  const provider =
    getServerEnv().STORAGE_PROVIDER === 's3'
      ? ('s3' as const)
      : ('local' as const)
  try {
    const objects = await getStorage().listObjects()
    const faviconCount = objects.filter((object) =>
      object.path.startsWith(FAVICON_PREFIX),
    ).length
    return {
      available: true,
      provider,
      imageCount: objects.length - faviconCount,
      faviconCount,
      totalBytes: objects.reduce((sum, object) => sum + object.sizeBytes, 0),
    }
  } catch {
    return {
      available: false,
      provider,
      imageCount: null,
      faviconCount: null,
      totalBytes: null,
    }
  }
}

async function loadAiStats() {
  const [row] = await db
    .select({
      requestCount: count(),
      promptTokens: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)::int`,
      completionTokens: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${aiUsage.totalTokens}), 0)::int`,
      estimatedCostUsd: sql<string>`coalesce(sum(${aiUsage.estimatedCostUsd}), 0)::text`,
      pricedRequests: sql<number>`count(*) filter (where ${aiUsage.estimatedCostUsd} is not null)::int`,
      pricedTokens: sql<number>`coalesce(sum(${aiUsage.totalTokens}) filter (where ${aiUsage.estimatedCostUsd} is not null), 0)::int`,
    })
    .from(aiUsage)
  return (
    row ?? {
      requestCount: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: '0',
      pricedRequests: 0,
      pricedTokens: 0,
    }
  )
}

export const getInternalStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [storage, ai] = await Promise.all([loadStorageStats(), loadAiStats()])
    return { storage, ai }
  },
)
