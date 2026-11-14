import { UsageConsentPrompt } from '@/components/usage-statistics'

export function AppExtensions(props: { userId: string | null }) {
  return <UsageConsentPrompt key={props.userId ?? 'shared'} />
}
