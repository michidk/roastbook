import { useCallback } from 'react'
import { useAppSettings } from '@/hooks/use-app-settings'
import { formatDate, formatDateTime } from '@/lib/utils'

export function useDateFormatter() {
  const { dateFormat } = useAppSettings()
  return useCallback(
    (value: Date | string | number) => formatDate(value, dateFormat),
    [dateFormat],
  )
}

export function useDateTimeFormatter() {
  const { dateFormat } = useAppSettings()
  return useCallback(
    (value: Date | string | number) => formatDateTime(value, dateFormat),
    [dateFormat],
  )
}
