import { Button } from '@roastbook/ui/button'
import { DeleteConfirmation } from '@/components/delete-confirmation'

/** Built-in items can only be disabled; custom items can be deleted. */
export function RemoveOrDisable({
  name,
  isBuiltIn,
  onRemove,
  deleteDescription = 'Existing entries keep it, but it will no longer be offered for new entries.',
}: {
  readonly name: string
  readonly isBuiltIn: boolean
  readonly onRemove: () => Promise<void>
  readonly deleteDescription?: string
}) {
  return (
    <DeleteConfirmation
      title={isBuiltIn ? `Disable "${name}"?` : `Delete "${name}"?`}
      description={
        isBuiltIn
          ? 'Existing entries keep it. It will no longer be offered for new entries, and you can enable it again later.'
          : deleteDescription
      }
      confirmLabel={isBuiltIn ? 'Disable' : 'Delete'}
      busyLabel={isBuiltIn ? 'Disabling…' : 'Deleting…'}
      trigger={
        isBuiltIn ? (
          <Button type="button" variant="ghost" size="sm">
            Disable
          </Button>
        ) : undefined
      }
      onConfirm={onRemove}
    />
  )
}

export function EnableButton({
  onClick,
}: {
  readonly onClick: () => Promise<void>
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      Enable
    </Button>
  )
}
