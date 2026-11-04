import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { PageHelp } from '@/components/page-help'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { type SignUpChoice, signUpChoices } from '@/extension-points/sign-up'

export function CreateAccountDialog({
  email,
  busy,
  error,
  onCreate,
  onCancel,
}: {
  readonly email: string
  readonly busy: boolean
  readonly error: string
  readonly onCreate: (choices: Record<string, boolean>) => void
  readonly onCancel: () => void
}) {
  const [choices, setChoices] = useState<Record<string, boolean>>({})
  const missing = signUpChoices.some(
    (choice) => choice.required && !choices[choice.id],
  )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Create your Roastbook account</DialogTitle>
          <DialogDescription className="break-words">
            There’s no account for <strong>{email}</strong> yet. Create one to
            start your coffee journal.
          </DialogDescription>
        </DialogHeader>
        {signUpChoices.length || error ? (
          <DialogBody className="space-y-4">
            {signUpChoices.map((choice) => (
              <ChoiceRow
                key={choice.id}
                choice={choice}
                checked={choices[choice.id] === true}
                onChange={(checked) =>
                  setChoices((current) => ({
                    ...current,
                    [choice.id]: checked,
                  }))
                }
              />
            ))}
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-relaxed text-destructive-text"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}
          </DialogBody>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Use another email
          </Button>
          <Button
            disabled={busy || missing}
            aria-busy={busy}
            onClick={() => onCreate(choices)}
          >
            {busy ? (
              <LoaderCircle
                aria-hidden
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {busy ? 'Creating your account…' : 'Create account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChoiceRow({
  choice,
  checked,
  onChange,
}: {
  readonly choice: SignUpChoice
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-1">
      <Checkbox
        id={`sign-up-${choice.id}`}
        className="mt-2.5"
        checked={checked}
        onCheckedChange={onChange}
        aria-required={choice.required || undefined}
      />
      <Label
        htmlFor={`sign-up-${choice.id}`}
        className="block flex-1 py-1.5 pl-2 font-normal leading-relaxed"
      >
        {choice.label}
        {choice.required ? (
          <span className="text-muted-foreground"> (required)</span>
        ) : null}
      </Label>
      <PageHelp ariaLabel={`About ${choice.name}`}>{choice.help}</PageHelp>
    </div>
  )
}
