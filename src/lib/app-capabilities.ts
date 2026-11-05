import { DEMO_MODE, DEMO_MODE_READ_ONLY_MESSAGE } from '@/lib/build-mode'

export const DEMO_INSTALL_MESSAGE =
  'Installing Roastbook is not available in the demo. Install your self-hosted app to use it offline.'
export const DEMO_OFFLINE_MESSAGE =
  'Offline support is not available in the demo.'

export type AppFeature =
  | 'install'
  | 'offline'
  | 'journal-write'
  | 'server-write'
  | 'ai'
export type FeatureAvailability =
  | { readonly available: true }
  | { readonly available: false; readonly reason: string }

export function featureAvailability(
  feature: AppFeature,
  {
    demo = DEMO_MODE,
    online = true,
    configured = true,
  }: {
    readonly demo?: boolean
    readonly online?: boolean
    readonly configured?: boolean
  } = {},
): FeatureAvailability {
  if (demo && (feature === 'journal-write' || (feature === 'ai' && configured)))
    return { available: true }
  if (demo)
    return {
      available: false,
      reason:
        feature === 'install'
          ? DEMO_INSTALL_MESSAGE
          : feature === 'offline'
            ? DEMO_OFFLINE_MESSAGE
            : DEMO_MODE_READ_ONLY_MESSAGE,
    }
  if (feature === 'ai' && !configured)
    return { available: false, reason: 'AI is not configured.' }
  if ((feature === 'ai' || feature === 'server-write') && !online)
    return {
      available: false,
      reason: 'Connect to the server to use this action.',
    }
  return { available: true }
}

export function requireFeature(
  feature: AppFeature,
  options?: Parameters<typeof featureAvailability>[1],
): void {
  const availability = featureAvailability(feature, options)
  if (!availability.available) throw new Error(availability.reason)
}
