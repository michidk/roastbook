import { useEffect, useState } from 'react'
import { AiAllowanceSettings } from '@/components/settings/ai-allowance-settings'
import { AiSettings } from '@/components/settings/hosted-ai-settings'
import { getAiAllowance } from '@/lib/server/ai-allowance'
import {
  type AiRequestStats,
  getAiRequestStats,
} from '@/lib/server/ai-request-logs'
import { getProvidedAiRequestStats } from '@/lib/server/provided-ai-request-stats'

export function AiSettingsPanels() {
  const [data, setData] = useState<{
    allowance: Awaited<ReturnType<typeof getAiAllowance>>
    stats: AiRequestStats
    providedStats: AiRequestStats
  }>()
  useEffect(() => {
    void Promise.all([
      getAiAllowance(),
      getAiRequestStats(),
      getProvidedAiRequestStats(),
    ])
      .then(([allowance, stats, providedStats]) =>
        setData({ allowance, stats, providedStats }),
      )
      .catch(() => undefined)
  }, [])
  if (!data) return null
  return (
    <>
      <AiAllowanceSettings
        allowance={data.allowance}
        stats={data.providedStats}
      />
      <AiSettings
        stats={data.stats}
        providedAvailable={data.allowance.providedAvailable}
      />
    </>
  )
}
