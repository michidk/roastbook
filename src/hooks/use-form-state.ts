import { useCallback, useState } from 'react'

/**
 * Controlled-form state whose writes always go through a functional update, so
 * two field changes in the same tick can't clobber each other the way a
 * `setFormData({ ...formData, field })` spread over a stale render does.
 */
export function useFormState<T extends Record<string, unknown>>(
  initialValues: T | (() => T),
) {
  const [values, setValues] = useState<T>(initialValues)

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }, [])

  const patch = useCallback((partial: Partial<T>) => {
    setValues((current) => ({ ...current, ...partial }))
  }, [])

  const setField = useCallback(
    <K extends keyof T>(key: K) =>
      (value: T[K]) =>
        set(key, value),
    [set],
  )

  return { values, set, setField, patch, setValues }
}
