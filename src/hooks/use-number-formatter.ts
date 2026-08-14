import { useCallback } from 'react'
import { useAppSettings } from '@/hooks/use-app-settings'
import { formatNumber } from '@/lib/number-format'

export function useNumberFormatter() {
  const { numberFormat } = useAppSettings()
  return useCallback(
    (value: number | string, grouping = true) =>
      formatNumber(value, numberFormat, { grouping }),
    [numberFormat],
  )
}
