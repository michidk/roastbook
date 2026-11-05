import { useRouter } from '@tanstack/react-router'
import { Braces, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { PanelSection } from '@/components/section-layout'
import { IntegrationKeys } from '@/components/settings/integration-keys'
import { RateLimitUsage } from '@/components/settings/rate-limit-usage'
import { Button, buttonVariants } from '@/components/ui/button'
import type { getApiAccessState } from '@/lib/server/integrations'
import type { IntegrationKeyPrefill } from '@/modules/integrations/key-link'

type ApiAccessState = Awaited<ReturnType<typeof getApiAccessState>>

/** API keys, the base URL and the shared rate limits. */
export function ApiSettings({
  state,
  prefill,
  onPrefillDone,
}: {
  readonly state: ApiAccessState
  readonly prefill: IntegrationKeyPrefill | null
  readonly onPrefillDone: () => void
}) {
  const router = useRouter()
  const example = `curl -H "Authorization: Bearer $ROASTBOOK_API_KEY" \\\n  "${state.baseUrl}/brews?page=1"`

  async function copyBaseUrl() {
    try {
      await navigator.clipboard.writeText(state.baseUrl)
      toast.success('URL copied')
    } catch {
      toast.error('Could not copy the URL. Select and copy it manually.')
    }
  }

  return (
    <>
      <PanelSection
        title="API"
        description="Read and change your journal from scripts and other apps. Everything you can do in Roastbook is available, except account and administration settings."
        action={<Braces aria-hidden="true" className="size-5 text-link" />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={state.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            Open API explorer
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <a
            href={state.documentationUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            OpenAPI description (JSON)
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {state.baseUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyBaseUrl()}
          >
            <Copy aria-hidden="true" />
            Copy URL
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
          {example}
        </pre>
        <p className="text-sm text-muted-foreground">
          JSON responses carry a <code>data</code> field and ISO 8601 dates;
          picture downloads return the image itself. The interactive API
          explorer lists every endpoint with its parameters and permission, and
          lets you try requests.
        </p>
      </PanelSection>

      <PanelSection
        title="API keys"
        description="Each key acts only on your journal, with the permissions you choose. Keys are shown once; revoke any you no longer use."
      >
        <IntegrationKeys
          // A new link reopens the dialog with its values.
          key={prefill ? JSON.stringify(prefill) : 'keys'}
          kind="api"
          credentials={state.credentials}
          onChanged={() => router.invalidate()}
          prefill={prefill}
          onPrefillDone={onPrefillDone}
        />
      </PanelSection>

      <RateLimitUsage rateLimit={state.rateLimit} />
    </>
  )
}
