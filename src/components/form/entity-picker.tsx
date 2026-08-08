import { useState, type ReactNode } from "react"
import { useRouter } from "@tanstack/react-router"
import {
  CreatableCombobox,
  type CreatableComboboxProps,
  type FallbackOption,
} from "@/components/form/creatable-combobox"
import { EntityCreateDialog } from "@/components/form/entity-create-dialog"

export interface CreatedEntity {
  id: number | string
  name: string
}

interface EntityCreateFormArgs {
  initialName: string
  onCreated: (entity: CreatedEntity) => Promise<void>
  onCancel: () => void
}

interface EntityPickerProps<T>
  extends Omit<
    CreatableComboboxProps<T>,
    "onCreateRequest" | "fallbackOption"
  > {
  dialogTitle: string
  dialogDescription?: string
  renderCreateForm: (args: EntityCreateFormArgs) => ReactNode
}

export function EntityPicker<T>({
  dialogTitle,
  dialogDescription,
  renderCreateForm,
  onChange,
  ...comboboxProps
}: EntityPickerProps<T>) {
  const router = useRouter()
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<FallbackOption | null>(null)

  const closeDialog = () => setPendingName(null)

  const handleCreated = async (entity: CreatedEntity) => {
    const key = String(entity.id)
    // Router loader data is only one possible source of `items` — a parent may
    // hold its own list in state, which `invalidate()` cannot refresh — so keep
    // the created entity as a fallback instead of assuming it shows up there.
    setJustCreated({ key, label: entity.name })
    onChange(key)
    closeDialog()
    await router.invalidate()
  }

  return (
    <>
      <CreatableCombobox
        {...comboboxProps}
        onChange={onChange}
        onCreateRequest={setPendingName}
        fallbackOption={justCreated}
      />
      <EntityCreateDialog
        open={pendingName !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title={dialogTitle}
        description={dialogDescription}
      >
        {pendingName !== null
          ? renderCreateForm({
              initialName: pendingName,
              onCreated: handleCreated,
              onCancel: closeDialog,
            })
          : null}
      </EntityCreateDialog>
    </>
  )
}
