/** Bump when https://roastbook.coffee/terms changes; accounts record the version they accepted. */
export const TERMS_VERSION = '2026-11-04'
export const TERMS_URL = 'https://roastbook.coffee/terms'
export const PRIVACY_URL = 'https://roastbook.coffee/privacy'
/** Read once by the consent manager after an account is created on the sign-in page. */
export const PENDING_ANALYTICS_KEY = 'roastbook-pending-analytics'
export const OPEN_PRIVACY_SETTINGS = 'roastbook:privacy-settings'
/** Self-hosted c15t site, reached only through the Worker's `/consent/` proxy. */
export const CONSENT_BACKEND_URL = 'https://consent.k8s.lohr.dev/s/roastbook-app'
export const CONSENT_HOSTS = ['app.roastbook.coffee', 'staging.roastbook.coffee']
