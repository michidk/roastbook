import '@tanstack/react-start/server-only'

// Default: new accounts accept no terms and have no newsletter. An extension can
// require a terms version, which the account-creation hook then enforces.
export function signUpPolicy(): {
  termsVersion: string | null
  newsletter: boolean
} {
  return { termsVersion: null, newsletter: false }
}
