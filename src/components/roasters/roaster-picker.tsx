import { EntityPicker } from '@/components/form/entity-picker'
import { RoasterForm } from '@/components/roasters/roaster-form'

export interface RoasterOption {
  id: number
  name: string
  location?: string | null
  country?: string | null
}

interface RoasterPickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  roasters: readonly RoasterOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function RoasterPicker({
  id,
  label,
  value,
  onChange,
  roasters,
  placeholder = 'Select roaster',
  required,
  disabled,
  className,
}: RoasterPickerProps) {
  return (
    <EntityPicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={roasters}
      getKey={(roaster) => roaster.id}
      getLabel={(roaster) => roaster.name}
      getDescription={(roaster) =>
        [roaster.location, roaster.country].filter(Boolean).join(', ') || null
      }
      placeholder={placeholder}
      searchPlaceholder="Search roasters…"
      emptyMessage="No matching roasters."
      createLabel={(query) => `Add “${query}” as a new roaster`}
      noMatchHint={(query) => `No roaster named “${query}” yet`}
      required={required}
      disabled={disabled}
      className={className}
      dialogTitle="Add roaster"
      dialogDescription="Create the roaster without leaving this form."
      renderCreateForm={({ initialName, onCreated, onCancel }) => (
        <RoasterForm
          initialName={initialName}
          onCreated={(roaster) =>
            onCreated({ id: roaster.id, name: roaster.name })
          }
          onCancel={onCancel}
        />
      )}
    />
  )
}
