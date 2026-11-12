import { Switch } from '@roastbook/ui/switch'
import { DeleteConfirmation } from '@/components/delete-confirmation'

/**
 * Built-in items switch on and off in place; custom items can only be
 * deleted, after a confirmation.
 */
export function ItemAvailability({
  name,
  isBuiltIn,
  enabled,
  onEnabledChange,
  onDelete,
  deleteDescription = 'Existing entries keep it, but it will no longer be offered for new entries.',
}: {
  readonly name: string
  readonly isBuiltIn: boolean
  readonly enabled: boolean
  readonly onEnabledChange: (enabled: boolean) => void
  readonly onDelete: () => Promise<void>
  readonly deleteDescription?: string
}) {
  if (isBuiltIn) {
    return (
      <Switch
        aria-label={`Offer ${name}`}
        checked={enabled}
        onCheckedChange={onEnabledChange}
      />
    )
  }
  return (
    <DeleteConfirmation
      title={`Delete "${name}"?`}
      description={deleteDescription}
      onConfirm={onDelete}
    />
  )
}
