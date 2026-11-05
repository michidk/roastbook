import { createFileRoute } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/edition-ui'
import { ApiSettings } from '@/components/settings/api-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { searchValidator } from '@/lib/search-params'
import { getApiAccessState } from '@/lib/server/integrations'
import {
  integrationKeyPrefill,
  parseIntegrationKeySearch,
} from '@/modules/integrations/key-link'

export const Route = createFileRoute('/settings/api')({
  // ?create=true&name=…&scopes=a:read,b:write&expires=never opens a filled-in
  // new-key dialog, like GitHub's token links.
  validateSearch: searchValidator(parseIntegrationKeySearch),
  loader: () => (DEMO_MODE ? null : getApiAccessState()),
  component: ApiSettingsSection,
})

function ApiSettingsSection() {
  const state = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!state) return <DemoIntegrationNotice />
  return (
    <ApiSettings
      state={state}
      prefill={integrationKeyPrefill(search)}
      onPrefillDone={() => void navigate({ search: {}, replace: true })}
    />
  )
}
