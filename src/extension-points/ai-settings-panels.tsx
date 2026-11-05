import { useEffect, useState } from 'react'
import { AiSettings } from '@/components/settings/ai-settings'
import {
  type AiRequestStats,
  getAiRequestStats,
} from '@/lib/server/ai-request-logs'

// Default: token usage and the request log beneath the AI provider settings.
// An extension can replace this module to add its own panels.
export function AiSettingsPanels() {
  const [stats, setStats] = useState<AiRequestStats>()
  useEffect(() => {
    void getAiRequestStats()
      .then(setStats)
      .catch(() => undefined)
  }, [])
  return stats ? <AiSettings stats={stats} /> : null
}
