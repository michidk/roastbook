// Server platform. The browser runtime replaces this module (see scripts/vite-journal-platform.ts).

export { trackEvent } from '@/extension-points/analytics.server'
export {
  deleteWebsiteFaviconBestEffort,
  refreshWebsiteFaviconBestEffort,
} from '@/lib/server/favicon-cache.server'
