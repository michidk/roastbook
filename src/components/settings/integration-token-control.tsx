import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createToken,
  deleteToken,
  getIntegrationTokens,
} from '@/lib/server/account'

export function IntegrationTokenControl() {
  const [token, setToken] = useState(''),
    [busy, setBusy] = useState(false)
  const [tokens, setTokens] = useState<
    Awaited<ReturnType<typeof getIntegrationTokens>>
  >([])
  useEffect(() => {
    void getIntegrationTokens()
      .then(setTokens)
      .catch(() => undefined)
  }, [])
  async function create() {
    setBusy(true)
    try {
      setToken(await createToken({ data: { kind: 'mcp', name: 'MCP client' } }))
      setTokens(await getIntegrationTokens())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not create a token',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      {tokens
        .filter((item) => item.kind === 'mcp')
        .map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3"
          >
            <span>{item.name}</span>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void deleteToken({ data: { id: item.id } })
                  .then(() => getIntegrationTokens())
                  .then(setTokens)
                  .catch(() => toast.error('Could not revoke the token'))
                  .finally(() => setBusy(false))
              }}
            >
              Revoke
            </Button>
          </div>
        ))}
      <Button
        type="button"
        disabled={busy}
        variant="outline"
        onClick={() => void create()}
      >
        Create MCP token
      </Button>
      {token ? (
        <>
          <Label htmlFor="mcp-token">
            Copy this token now. It expires in one year.
          </Label>
          <Input
            id="mcp-token"
            readOnly
            value={token}
            onFocus={(event) => event.target.select()}
          />
          <Button type="button" variant="ghost" onClick={() => setToken('')}>
            Dismiss
          </Button>
        </>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Configure your client with an Authorization: Bearer token header. Revoke
        unused tokens here or in Account settings.
      </p>
    </div>
  )
}
