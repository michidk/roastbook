import { useEffect, useState } from 'react'
import { toLocalDateTimeInput } from '@/lib/date-input'

/**
 * Formats a date after hydration so server and browser time zones cannot
 * produce different initial markup for a datetime-local field.
 */
export function useLocalDateTimeInput(value: Date | string | number) {
  const [input, setInput] = useState('')

  useEffect(() => {
    setInput(toLocalDateTimeInput(value))
  }, [value])

  return [input, setInput] as const
}

export function useCurrentLocalDateTimeLimit() {
  const [input, setInput] = useState('')

  useEffect(() => {
    const update = () => setInput(toLocalDateTimeInput(new Date()))
    update()
    const interval = window.setInterval(update, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  return input
}
