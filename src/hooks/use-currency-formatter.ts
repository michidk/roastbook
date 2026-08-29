import { useCallback } from 'react'
import { useAppSettings } from '@/hooks/use-app-settings'
import { formatCurrency } from '@/lib/currency-format'

export function useCurrencyFormatter() {
  const { numberFormat } = useAppSettings()
  return useCallback(
    (value: number | string, currency: string) =>
      formatCurrency(value, currency, numberFormat),
    [numberFormat],
  )
}
