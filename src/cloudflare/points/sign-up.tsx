import type { SignUpChoice } from '../../extension-points/sign-up'
export type { SignUpChoice } from '../../extension-points/sign-up'
import {
  PENDING_ANALYTICS_KEY,
  PRIVACY_URL,
  TERMS_URL,
  TERMS_VERSION,
} from '../legal'

const link = 'font-medium text-link underline underline-offset-2'

export const signUpChoices: readonly SignUpChoice[] = [
  {
    id: 'terms',
    name: 'the Terms of Service',
    required: true,
    label: (
      <>
        I accept the{' '}
        <a href={TERMS_URL} target="_blank" rel="noreferrer" className={link}>
          Terms of Service
        </a>
      </>
    ),
    help: 'The terms explain what you can expect from hosted Roastbook and what we ask of you: your journal stays yours, you can export or delete it at any time, and the service is free while we keep improving it.',
  },
  {
    id: 'analytics',
    name: 'analytics',
    label: 'Help improve Roastbook with usage analytics',
    help: (
      <>
        Analytics, error reports and masked session replays help us improve
        Roastbook and fix problems faster. Your journal content stays hidden,
        and you can change this at any time in your account settings.{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className={link}>
          Privacy Notice
        </a>
      </>
    ),
  },
  {
    id: 'newsletter',
    name: 'the newsletter',
    label: 'Send me occasional Roastbook news',
    help: 'Now and then we write about new features and coffee guides. No spam, and you can unsubscribe at any time in your account settings.',
  },
]

export function signUpRequest(choices: Record<string, boolean>) {
  return {
    ...(choices.terms ? { termsVersion: TERMS_VERSION } : {}),
    newsletterOptIn: choices.newsletter === true,
  }
}

export function afterSignUp(choices: Record<string, boolean>) {
  try {
    sessionStorage.setItem(
      PENDING_ANALYTICS_KEY,
      choices.analytics ? 'granted' : 'denied',
    )
  } catch {
    // Without storage the consent banner asks again on the next page.
  }
}
