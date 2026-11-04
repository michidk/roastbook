import { useState } from 'react'
import { toast } from 'sonner'
import type { AppSettings } from '@/lib/app-settings'
import { getErrorMessage } from '@/lib/error-message'

/**
 * Optimistically saves a single application setting: the new value is applied
 * immediately, confirmed from the server response, and rolled back to the
 * saved value with an error toast when the mutation fails.
 */
export function useSettingMutation<Value>({
  savedValue,
  applyValue,
  mutate,
  selectValue,
  errorMessage,
  successMessage,
}: {
  readonly savedValue: Value
  readonly applyValue: (value: Value) => void
  readonly mutate: (value: Value) => Promise<AppSettings>
  readonly selectValue: (settings: AppSettings) => Value
  readonly errorMessage: string
  readonly successMessage?: string
}) {
  const [isSaving, setIsSaving] = useState(false)

  const save = async (nextValue: Value) => {
    if (isSaving) return
    applyValue(nextValue)
    setIsSaving(true)
    try {
      const updated = await mutate(nextValue)
      applyValue(selectValue(updated))
      if (successMessage) toast.success(successMessage)
    } catch (error) {
      applyValue(savedValue)
      toast.error(getErrorMessage(error, errorMessage))
    } finally {
      setIsSaving(false)
    }
  }

  return { isSaving, save }
}
