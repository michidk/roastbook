import { Copy, KeyRound, Plus, TriangleAlert } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { toast } from 'sonner'
import {
  isReauthenticationCancelled,
  useReauthentication,
} from '@/components/auth/reauthentication-dialog'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { ScopePicker } from '@/components/settings/scope-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useDateFormatter,
  useDateTimeFormatter,
} from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { getErrorMessage } from '@/lib/error-message'
import {
  createIntegrationKey,
  type getApiAccessState,
  revokeIntegrationKey,
  updateIntegrationKey,
} from '@/lib/server/integrations'
import {
  DEFAULT_KEY_EXPIRY,
  type IntegrationKeyPrefill,
  type KeyExpiry,
} from '@/modules/integrations/key-link'
import {
  allScopes,
  describeScopes,
  type IntegrationScope,
} from '@/modules/integrations/scopes'

type Credential = Awaited<
  ReturnType<typeof getApiAccessState>
>['credentials'][number]

const EXPIRY_OPTIONS = [
  { value: '1d', label: '1 day', days: 1 },
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '90d', label: '90 days', days: 90 },
  { value: '1y', label: '1 year', days: 365 },
  { value: 'custom', label: 'Custom date', days: null },
  { value: 'never', label: 'No expiry', days: null },
] as const satisfies readonly {
  value: KeyExpiry
  label: string
  days: number | null
}[]

function expiryDate(expiry: KeyExpiry, customDate: string) {
  if (expiry === 'never') return null
  if (expiry === 'custom') {
    // The end of the chosen day, in the browser's time zone.
    const date = new Date(`${customDate}T23:59:59`)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  const days =
    EXPIRY_OPTIONS.find((option) => option.value === expiry)?.days ?? 7
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(
      `Could not copy the ${label.toLowerCase()}. Select and copy it.`,
    )
  }
}

/** API keys or MCP tokens: same scopes, expiry, usage and lifecycle. */
export function IntegrationKeys({
  kind,
  credentials,
  onChanged,
  prefill = null,
  onPrefillDone,
}: {
  readonly kind: 'api' | 'mcp'
  readonly credentials: readonly Credential[]
  readonly onChanged: () => Promise<void> | void
  /** Opens the new-key dialog filled in from a link. */
  readonly prefill?: IntegrationKeyPrefill | null
  readonly onPrefillDone?: () => void
}) {
  const noun = kind === 'api' ? 'API key' : 'MCP token'
  const isOnline = useOnlineStatus()
  const formatDate = useDateFormatter()
  const formatDateTime = useDateTimeFormatter()
  const formatNumber = useNumberFormatter()
  const [creating, setCreating] = useState(prefill !== null)
  const [editing, setEditing] = useState<Credential | null>(null)

  async function revoke(credential: Credential) {
    await revokeIntegrationKey({ data: { id: credential.id } })
    await onChanged()
    toast.success(`${credential.name} revoked`)
  }

  return (
    <div className="space-y-4">
      {credentials.length ? (
        <ul className="space-y-3">
          {credentials.map((credential) => (
            <li
              key={credential.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0 flex-1 basis-56 space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-semibold">
                    {credential.name}
                  </span>
                  {credential.expired ? (
                    <Badge variant="destructive">Expired</Badge>
                  ) : null}
                </p>
                {credential.tokenPrefix ? (
                  <code className="block font-mono text-xs text-muted-foreground">
                    {credential.tokenPrefix}…
                  </code>
                ) : null}
                <p className="text-sm">{describeScopes(credential.scopes)}</p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(credential.createdAt)} ·{' '}
                  {credential.expiresAt
                    ? `${credential.expired ? 'Expired' : 'Expires'} ${formatDate(credential.expiresAt)}`
                    : 'Never expires'}{' '}
                  ·{' '}
                  {credential.lastUsedAt
                    ? `Last used ${formatDateTime(credential.lastUsedAt)}`
                    : 'Never used'}{' '}
                  · {formatNumber(credential.requestsToday)} requests today
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isOnline}
                  onClick={() => setEditing(credential)}
                >
                  Permissions
                </Button>
                <DeleteConfirmation
                  title={`Revoke ${credential.name}?`}
                  description={`Requests with this ${noun} fail immediately. This cannot be undone.`}
                  confirmLabel="Revoke"
                  busyLabel="Revoking…"
                  onConfirm={() => revoke(credential)}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isOnline}
                    >
                      Revoke
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No {noun}s yet. Create one for each script or client so you can revoke
          them separately.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={!isOnline}
        onClick={() => setCreating(true)}
      >
        <Plus aria-hidden="true" />
        Create {noun}
      </Button>
      <CreateKeyDialog
        kind={kind}
        noun={noun}
        open={creating}
        initial={prefill}
        onOpenChange={(open) => {
          setCreating(open)
          if (!open && prefill) onPrefillDone?.()
        }}
        onCreated={onChanged}
      />
      {editing ? (
        <EditKeyDialog
          noun={noun}
          credential={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      ) : null}
    </div>
  )
}

function CreateKeyDialog({
  kind,
  noun,
  open,
  initial,
  onOpenChange,
  onCreated,
}: {
  readonly kind: 'api' | 'mcp'
  readonly noun: string
  readonly open: boolean
  readonly initial: IntegrationKeyPrefill | null
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated: () => Promise<void> | void
}) {
  const id = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [expiry, setExpiry] = useState<KeyExpiry>(
    initial?.expires ?? DEFAULT_KEY_EXPIRY,
  )
  const [customDate, setCustomDate] = useState('')
  const [scopes, setScopes] = useState<IntegrationScope[]>(() =>
    initial?.scopes.length ? initial.scopes : allScopes('read'),
  )
  const [prefilled, setPrefilled] = useState(initial !== null)
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  const reauthentication = useReauthentication()

  function reset() {
    setName('')
    setExpiry(DEFAULT_KEY_EXPIRY)
    setCustomDate('')
    setScopes(allScopes('read'))
    setPrefilled(false)
    setToken('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const expiresAt = expiryDate(expiry, customDate)
    if (expiresAt === undefined) {
      toast.error('Choose an expiry date')
      return
    }
    try {
      const reauthToken = await reauthentication.confirm('create-credential')
      setBusy(true)
      setToken(
        await createIntegrationKey({
          data: { kind, name: name.trim(), scopes, expiresAt, reauthToken },
        }),
      )
      await onCreated()
    } catch (error) {
      if (isReauthenticationCancelled(error)) return
      toast.error(getErrorMessage(error, `Could not create the ${noun}`))
    } finally {
      setBusy(false)
    }
  }

  // The earliest custom date, in the same local calendar as expiryDate().
  const next = new Date(Date.now() + 86_400_000)
  const tomorrow = [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-')
  return (
    <>
      {reauthentication.dialog}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          // Closing mid-request would lose the token shown only once.
          if (!nextOpen && busy) return
          if (!nextOpen) reset()
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent showCloseButton={!busy}>
          {token ? (
            <>
              <DialogHeader>
                <DialogTitle>Copy your {noun}</DialogTitle>
                <DialogDescription>
                  This is the only time it is shown. Store it in your client or
                  password manager.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="flex gap-2">
                  <Label htmlFor={`${id}-token`} className="sr-only">
                    {noun}
                  </Label>
                  <Input
                    id={`${id}-token`}
                    readOnly
                    value={token}
                    className="font-mono"
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Copy ${noun}`}
                    onClick={() => void copy(token, noun)}
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    reset()
                    onOpenChange(false)
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={(event) => void submit(event)} className="contents">
              <DialogHeader>
                <DialogTitle>Create {noun}</DialogTitle>
                <DialogDescription>
                  Choose what it may do. It can only reach your own journal and
                  never manages your account.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-5">
                {prefilled ? (
                  <p
                    role="note"
                    className="rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    Filled in from a link. Check the name, expiry and
                    permissions before you create it.
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor={`${id}-name`}>Name</Label>
                  <Input
                    id={`${id}-name`}
                    required
                    maxLength={80}
                    placeholder={
                      kind === 'api' ? 'Migration script' : 'Claude Desktop'
                    }
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${id}-expiry`}>Expires</Label>
                    <Select
                      value={expiry}
                      onValueChange={(value) => setExpiry(value as KeyExpiry)}
                    >
                      <SelectTrigger id={`${id}-expiry`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {expiry === 'custom' ? (
                    <div className="space-y-2">
                      <Label htmlFor={`${id}-date`}>Expiry date</Label>
                      <Input
                        id={`${id}-date`}
                        type="date"
                        required
                        min={tomorrow}
                        value={customDate}
                        onChange={(event) => setCustomDate(event.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
                {expiry === 'never' ? (
                  <p
                    role="alert"
                    className="flex gap-2 rounded-md border border-warning-border bg-warning px-3 py-2 text-sm text-warning-foreground"
                  >
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    Keys without expiry are not recommended. A leaked key keeps
                    working until you revoke it; prefer an expiry and create a
                    new key when it runs out.
                  </p>
                ) : null}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Permissions</p>
                  <ScopePicker
                    id={`${id}-scopes`}
                    value={scopes}
                    onChange={setScopes}
                    disabled={busy}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={busy || !name.trim() || !scopes.length}
                >
                  <KeyRound aria-hidden="true" />
                  {busy ? 'Creating…' : `Create ${noun}`}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function EditKeyDialog({
  noun,
  credential,
  onClose,
  onSaved,
}: {
  readonly noun: string
  readonly credential: Credential
  readonly onClose: () => void
  readonly onSaved: () => Promise<void> | void
}) {
  const id = useId()
  const [name, setName] = useState(credential.name)
  const [scopes, setScopes] = useState<IntegrationScope[]>(credential.scopes)
  const [busy, setBusy] = useState(false)
  const reauthentication = useReauthentication()

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const reauthToken = await reauthentication.confirm('change-permissions')
      setBusy(true)
      await updateIntegrationKey({
        data: { id: credential.id, name: name.trim(), scopes, reauthToken },
      })
      await onSaved()
      toast.success('Permissions saved. New requests use them immediately.')
      onClose()
    } catch (error) {
      if (isReauthenticationCancelled(error)) return
      toast.error(getErrorMessage(error, 'Could not save the permissions'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {reauthentication.dialog}
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <form onSubmit={(event) => void submit(event)} className="contents">
            <DialogHeader>
              <DialogTitle>Edit {noun}</DialogTitle>
              <DialogDescription>
                Changes apply to the next request; the {noun} itself stays the
                same.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor={`${id}-name`}>Name</Label>
                <Input
                  id={`${id}-name`}
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Permissions</p>
                <ScopePicker
                  id={`${id}-scopes`}
                  value={scopes}
                  onChange={setScopes}
                  disabled={busy}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || !name.trim() || !scopes.length}
              >
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
