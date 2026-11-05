import { Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { deleteToken, getIntegrationTokens } from '@/lib/server/account'
import { createShottimerToken } from '@/lib/server/shottimer'

/** The shottimer device token. API keys and MCP tokens use IntegrationKeys. */
export function IntegrationTokenControl({
  onSaved,
}: {
  readonly onSaved?: () => void
}) {
  const kind = 'shottimer'
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [tokens, setTokens] = useState<
    Awaited<ReturnType<typeof getIntegrationTokens>>
  >([])
  const formatDate = useDateFormatter()
  const visibleTokens = tokens.filter((item) => item.kind === kind)

  useEffect(() => {
    let active = true
    void getIntegrationTokens()
      .then((items) => {
        if (active) setTokens(items)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    setLoading(true)
    try {
      setTokens(await getIntegrationTokens())
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  async function mutate(work: () => Promise<void>, message: string) {
    setBusy(true)
    try {
      await work()
      await refresh()
      onSaved?.()
      toast.success(message)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update the token',
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Token copied')
    } catch {
      toast.error('Could not copy the token. Select and copy it manually.')
    }
  }

  const disabled = busy || loading || loadError
  return (
    <div className="space-y-4">
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading tokens…
        </p>
      ) : null}
      {loadError ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive-text">
            Could not load your tokens.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void refresh()}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {visibleTokens.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="break-words font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.expiresAt
                ? `Expires ${formatDate(item.expiresAt)}`
                : 'Never expires'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              void mutate(async () => {
                await deleteToken({ data: { id: item.id } })
                setToken('')
              }, 'Token revoked')
            }
          >
            Revoke
          </Button>
        </div>
      ))}
      {!loading && !loadError && visibleTokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No device tokens created.
        </p>
      ) : null}
      <Button
        type="button"
        disabled={disabled}
        variant="outline"
        onClick={() =>
          void mutate(async () => {
            setToken(await createShottimerToken())
          }, 'Token created. Copy it now; it will not be shown again.')
        }
      >
        {busy
          ? 'Updating…'
          : visibleTokens.length
            ? 'Replace token'
            : 'Create token'}
      </Button>
      {token ? (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-token`}>
            Copy this token now. It expires in one year.
          </Label>
          <div className="flex gap-2">
            <Input
              id={`${kind}-token`}
              readOnly
              value={token}
              className="font-mono"
              onFocus={(event) => event.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy token"
              onClick={() => void copyToken()}
            >
              <Copy aria-hidden="true" />
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={() => setToken('')}>
            Dismiss token
          </Button>
        </div>
      ) : null}
    </div>
  )
}
