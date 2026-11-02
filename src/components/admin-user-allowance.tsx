import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setUserAiLimit } from '@/lib/server/account'

export function AdminUserAllowance({
  userId,
  limit,
  used,
  busy,
  onSave,
}: {
  userId: string
  limit: number
  used: number
  busy: boolean
  onSave: (work: () => Promise<unknown>) => Promise<void>
}) {
  const [value, setValue] = useState(String(limit))
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave(() =>
          setUserAiLimit({ data: { userId, limit: Number(value) } }),
        )
      }}
    >
      <Label htmlFor={`allowance-${userId}`}>Free requests per week</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={`allowance-${userId}`}
          className="w-28"
          type="number"
          inputMode="numeric"
          min={0}
          max={2147483647}
          step={1}
          required
          value={value}
          disabled={busy}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={busy || value === String(limit)}
        >
          Save allowance
        </Button>
        <span className="text-sm text-muted-foreground">
          {used} used this week
        </span>
      </div>
    </form>
  )
}
