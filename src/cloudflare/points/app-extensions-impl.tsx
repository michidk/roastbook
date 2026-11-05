import {
  ConsentBanner,
  ConsentDialog,
  ConsentManagerProvider,
  useConsentManager,
} from '@c15t/react'
import './consent.css'
import type { PostHog } from 'posthog-js'
import { useEffect } from 'react'
import { getAnalyticsConfig } from '../analytics'
import {
  CONSENT_HOSTS,
  OPEN_PRIVACY_SETTINGS,
  PENDING_ANALYTICS_KEY,
  PRIVACY_URL,
  TERMS_URL,
} from '../legal'

const MIRROR_COOKIE = 'roastbook_analytics'

let client: Promise<PostHog | null> | undefined
function loadPostHog() {
  client ??= Promise.all([import('posthog-js'), getAnalyticsConfig()]).then(
    ([{ default: posthog }, { projectToken }]) => {
      if (!projectToken) return null
      posthog.init(projectToken, {
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: 'history_change',
        capture_exceptions: true,
        // Clicked elements' text would leak journal content; pageviews and explicit events suffice.
        autocapture: false,
        session_recording: {
          // Journal content is private: replays show layout and flow only.
          maskAllInputs: true,
          maskTextSelector: '*',
        },
      })
      return posthog
    },
  )
  return client
}

/** Loads PostHog only with c15t "measurement" consent and mirrors it for the server. */
function Analytics({ userId }: { userId: string | null }) {
  const { has, hasConsented } = useConsentManager()
  const allowed = has('measurement')
  const decided = hasConsented()
  useEffect(() => {
    if (!decided) return
    // biome-ignore lint/suspicious/noDocumentCookie: the server reads this first-party consent mirror.
    document.cookie = `${MIRROR_COOKIE}=${allowed ? 'granted' : 'denied'}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    if (!allowed) {
      void client?.then((posthog) => posthog?.opt_out_capturing())
      return
    }
    void loadPostHog().then((posthog) => {
      if (!posthog) return
      posthog.opt_in_capturing()
      if (userId) posthog.identify(userId)
      else if (posthog.get_property('$user_state') === 'identified')
        posthog.reset()
    })
  }, [allowed, decided, userId])
  return null
}

/** Applies the analytics choice made while creating an account, and opens the
 *  privacy dialog from account settings. */
function ConsentBridge() {
  const { setSelectedConsent, saveConsents, setActiveUI } = useConsentManager()
  useEffect(() => {
    let pending: string | null = null
    try {
      pending = sessionStorage.getItem(PENDING_ANALYTICS_KEY)
      sessionStorage.removeItem(PENDING_ANALYTICS_KEY)
    } catch {
      // Storage is optional.
    }
    if (pending) {
      setSelectedConsent('measurement', pending === 'granted')
      void saveConsents('custom')
    }
    const open = () => setActiveUI('dialog')
    window.addEventListener(OPEN_PRIVACY_SETTINGS, open)
    return () => window.removeEventListener(OPEN_PRIVACY_SETTINGS, open)
  }, [setSelectedConsent, saveConsents, setActiveUI])
  return null
}

/** Signed-out pages (sign-in) link the hosted service's terms and privacy notice. */
function LegalLinks() {
  return (
    <nav
      aria-label="Legal"
      className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex justify-center gap-4 text-xs text-muted-foreground"
    >
      {[
        { href: TERMS_URL, label: 'Terms of Service' },
        { href: PRIVACY_URL, label: 'Privacy' },
      ].map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="pointer-events-auto inline-flex min-h-11 items-center underline-offset-2 hover:text-foreground hover:underline"
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}

// Previews have changing hostnames the consent backend does not trust, so they keep consent local.
const hostedConsent = CONSENT_HOSTS.includes(window.location.hostname)

export default function AppExtensions({ userId }: { userId: string | null }) {
  return (
    <ConsentManagerProvider
      options={{
        ...(hostedConsent
          ? { mode: 'hosted', backendURL: '/consent' }
          : { mode: 'offline' }),
        consentCategories: ['necessary', 'measurement'],
        legalLinks: {
          privacyPolicy: { href: PRIVACY_URL, label: 'Privacy Notice' },
        },
        i18n: {
          locale: 'en',
          detectBrowserLanguage: false,
          messages: {
            en: {
              common: {
                acceptAll: 'Accept all',
                rejectAll: 'Reject all',
                customize: 'Choose settings',
                save: 'Save settings',
              },
              cookieBanner: {
                title: 'Your privacy, your choice',
                description:
                  'With your permission, we use analytics, error reports, masked session replays and occasional feedback surveys to improve Roastbook. Your journal content stays hidden.',
              },
              consentTypes: {
                necessary: {
                  title: 'Essential storage',
                  description:
                    'Keeps you signed in and stores your privacy choice. This cannot be disabled.',
                },
                measurement: {
                  title: 'Analytics',
                  description:
                    'PostHog analytics, error reports, feedback surveys and session replays with all text and inputs masked.',
                },
              },
            },
          },
        },
        // Same banner theme and layout as roastbook.coffee.
        theme: {
          colors: { primary: '#aa612f' },
          consentActions: {
            accept: { variant: 'primary', mode: 'filled' },
            reject: { variant: 'primary', mode: 'filled' },
            customize: { variant: 'neutral', mode: 'stroke' },
          },
        },
      }}
    >
      <ConsentBridge />
      <Analytics userId={userId} />
      {userId ? null : <LegalLinks />}
      <ConsentBanner
          layout={[['reject', 'accept'], 'customize']}
          primaryButton={['reject', 'accept']}
          legalLinks={['privacyPolicy']}
        />
      <ConsentDialog legalLinks={['privacyPolicy']} />
    </ConsentManagerProvider>
  )
}
