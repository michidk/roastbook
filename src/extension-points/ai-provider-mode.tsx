import type { ReactNode } from 'react'

// Default: the user always brings their own provider. An extension can replace
// this hook to offer another source of AI requests next to the settings form.
export function useAiProviderMode(): {
  usesByo: boolean
  control: ReactNode
  description?: string
} {
  return { usesByo: true, control: null }
}
