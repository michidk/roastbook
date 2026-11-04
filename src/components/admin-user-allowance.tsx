import { useState } from 'react'
import { NumberInput } from '@/components/number-input'
import { Button } from '@/components/ui/button'
import { DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { setUserAiLimit } from '@/lib/server/account'

export function AdminUserAllowance({
  userId,
  limit,
  used,
  busy,
  onSave,
  onCancel,
}: {
  userId: string
  limit: number
  used: number
  busy: boolean
  onSave: (work: () => Promise<unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState(String(limit))
  const number = useNumberFormatter()
  const valid = /^\d+$/.test(value) && Number(value) <= 2147483647
  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid || busy) return
        void onSave(() =>
          setUserAiLimit({ data: { userId, limit: Number(value) } }),
        )
      }}
    >
      <DialogBody className="space-y-3">
        <Label htmlFor={`allowance-${userId}`}>Free requests per week</Label>
        <NumberInput
          id={`allowance-${userId}`}
          min={0}
          max={2147483647}
          step={1}
          required
          value={value}
          disabled={busy}
          aria-invalid={!valid}
          aria-describedby={`allowance-help-${userId}`}
          onChange={setValue}
        />
        <p
          id={`allowance-help-${userId}`}
          className="text-sm text-muted-foreground"
        >
          {valid
            ? `${number(used)} requests used this week. Set the allowance to 0 to disable free AI for this user.`
            : 'Enter a whole number between 0 and 2,147,483,647.'}
        </p>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={busy || !valid || Number(value) === limit}
          aria-busy={busy}
        >
          {busy ? 'Saving…' : 'Save allowance'}
        </Button>
      </DialogFooter>
    </form>
  )
}
