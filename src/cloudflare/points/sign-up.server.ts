import '@tanstack/react-start/server-only'
import { TERMS_VERSION } from '../legal'

export function signUpPolicy() {
  return { termsVersion: TERMS_VERSION, newsletter: true }
}
