import { Button } from '@roastbook/ui/button'
import { Input } from '@roastbook/ui/input'
import { Label } from '@roastbook/ui/label'
import { useRouter } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  isReauthenticationCancelled,
  useReauthentication,
} from '@/components/auth/reauthentication-dialog'
import { SelectField } from '@/components/form/form-field'
import { PanelSection } from '@/components/section-layout'
import { useAiProviderMode } from '@/extension-points/ai-provider-mode'
import {
  type AiProviderSettingsInput,
  aiProviderSettingsSchema,
} from '@/lib/ai-provider'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  clearAiProviderSettings,
  type getAiProviderSettings,
  updateAiProviderSettings,
} from '@/lib/server/ai-provider-settings'

type Settings = Awaited<ReturnType<typeof getAiProviderSettings>>
export function AiProviderSettings({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [saved, setSaved] = useState(settings)
  const [values, setValues] = useState<AiProviderSettingsInput>({
    baseURL: settings.baseURL,
    api: settings.api,
    visionModel: settings.visionModel,
    researchModel: settings.researchModel,
  })
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { usesByo, control, description } = useAiProviderMode()
  const reauthentication = useReauthentication()
  async function save() {
    setError('')
    try {
      const parsed = aiProviderSettingsSchema.safeParse({
        ...values,
        apiKey: key || undefined,
      })
      if (!parsed.success)
        throw new Error(
          parsed.error.issues[0]?.message ?? 'Check your provider settings',
        )
      const reauthToken = await reauthentication.confirm('save-ai-credentials')
      setBusy(true)
      const updated = await updateAiProviderSettings({
        data: { ...parsed.data, reauthToken },
      })
      setSaved(updated)
      setKey('')
      toast.success('AI provider saved')
      await router.invalidate()
    } catch (cause) {
      if (isReauthenticationCancelled(cause)) return
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save your AI provider',
      )
    } finally {
      setBusy(false)
    }
  }
  async function disconnect() {
    setBusy(true)
    setError('')
    try {
      const updated = await clearAiProviderSettings()
      setSaved(updated)
      setValues(updated)
      setKey('')
      toast.success('AI provider disconnected and stored key removed')
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not disconnect your AI provider',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      {reauthentication.dialog}
      <PanelSection
        title="AI provider"
        description={
          description ??
          'Bring your own API key. AI usage is billed by your provider, and connecting it is optional.'
        }
        action={<KeyRound className="size-5 text-link" aria-hidden="true" />}
      >
        {control}
        {error ? (
          <p role="alert" className="break-words text-sm text-destructive-text">
            {error}
          </p>
        ) : null}
        {usesByo ? (
          <>
            {!saved.canConfigure ? (
              <p role="status" className="text-sm text-muted-foreground">
                {DEMO_MODE
                  ? 'AI connections are unavailable in the demo.'
                  : 'AI connections are unavailable on this installation. Contact the administrator to enable them.'}
              </p>
            ) : null}
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <fieldset
                disabled={busy || !saved.canConfigure}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="ai-endpoint">API base URL</Label>
                  <Input
                    id="ai-endpoint"
                    type="url"
                    value={values.baseURL}
                    maxLength={2048}
                    required
                    onChange={(event) =>
                      setValues({ ...values, baseURL: event.target.value })
                    }
                    aria-describedby="ai-endpoint-help"
                  />
                  <p
                    id="ai-endpoint-help"
                    className="text-sm text-muted-foreground"
                  >
                    Use a provider you trust. Your key, prompts, and selected
                    journal data or images are sent to this endpoint. Changing
                    it requires entering your key again.
                  </p>
                </div>
                <SelectField
                  id="ai-api"
                  label="API format"
                  value={values.api}
                  options={[
                    { value: 'responses', label: 'Responses API' },
                    {
                      value: 'chat-completions',
                      label: 'Chat Completions API',
                    },
                  ]}
                  onChange={(api) => {
                    if (api === 'responses' || api === 'chat-completions')
                      setValues({ ...values, api })
                  }}
                />
                <div className="space-y-2">
                  <Label htmlFor="ai-key">
                    {saved.hasApiKey ? 'Replace API key' : 'API key'}
                  </Label>
                  <Input
                    id="ai-key"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={key}
                    maxLength={4096}
                    required={
                      !saved.hasApiKey ||
                      values.baseURL.replace(/\/+$/, '') !== saved.baseURL
                    }
                    placeholder={
                      saved.hasApiKey
                        ? 'A key is saved. Leave blank to keep it.'
                        : 'Enter your provider API key'
                    }
                    onChange={(event) => setKey(event.target.value)}
                    aria-describedby="ai-key-help"
                  />
                  <p id="ai-key-help" className="text-sm text-muted-foreground">
                    Your key is encrypted when stored and is never shown again.
                    Saving asks you to confirm it’s you first.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai-vision-model">Image model</Label>
                    <Input
                      id="ai-vision-model"
                      value={values.visionModel}
                      required
                      maxLength={200}
                      onChange={(event) =>
                        setValues({
                          ...values,
                          visionModel: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-research-model">
                      Research and recommendation model
                    </Label>
                    <Input
                      id="ai-research-model"
                      value={values.researchModel}
                      required
                      maxLength={200}
                      onChange={(event) =>
                        setValues({
                          ...values,
                          researchModel: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Model IDs must be supported by your provider. Image extraction
                  uses Chat Completions with image input. Recommendations
                  require structured output. Online research additionally
                  requires Responses API web search.
                </p>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save AI provider'}
                </Button>
              </fieldset>
            </form>
            {saved.hasApiKey ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                Disconnect AI provider
              </Button>
            ) : null}
          </>
        ) : null}
      </PanelSection>
    </>
  )
}
