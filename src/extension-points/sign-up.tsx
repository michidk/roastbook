import type { ReactNode } from 'react'

export interface SignUpChoice {
  id: string
  /** Plain-text name, used for the help button's accessible label. */
  name: string
  label: ReactNode
  help: ReactNode
  required?: boolean
}

// Default: creating an account only needs a confirmation. An extension can add
// consent checkboxes, the fields they send, and browser-side follow-up.
export const signUpChoices: readonly SignUpChoice[] = []

/** Extra fields sent with the sign-in request that creates the account. */
export function signUpRequest(
  _choices: Record<string, boolean>,
): Record<string, unknown> {
  return {}
}

/** Runs in the browser once the account exists, before leaving the login page. */
export function afterSignUp(_choices: Record<string, boolean>) {}
