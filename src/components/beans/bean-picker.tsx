import { EntityPicker } from "@/components/form/entity-picker"
import { BeanForm } from "@/components/beans/bean-form"

interface BeanOption {
  id: number
  name: string
  roaster?: string | null
  origin?: string | null
}

interface BeanPickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  beans: readonly BeanOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function BeanPicker({
  id,
  label,
  value,
  onChange,
  beans,
  placeholder = "Select beans",
  required,
  disabled,
  className,
  autoFocus,
}: BeanPickerProps) {
  return (
    <EntityPicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={beans}
      getKey={(bean) => bean.id}
      getLabel={(bean) => bean.name}
      getDescription={(bean) =>
        [bean.roaster, bean.origin].filter(Boolean).join(" · ") || null
      }
      placeholder={placeholder}
      searchPlaceholder="Search beans…"
      emptyMessage="No matching beans."
      createLabel={(query) => `Add “${query}” as new beans`}
      noMatchHint={(query) => `No beans named “${query}” yet`}
      required={required}
      disabled={disabled}
      className={className}
      autoFocus={autoFocus}
      dialogTitle="Add beans"
      dialogDescription="Create the bag of beans without leaving this form."
      renderCreateForm={({ initialName, onCreated, onCancel }) => (
        <BeanForm
          initialName={initialName}
          onCreated={(bean) => onCreated({ id: bean.id, name: bean.name })}
          onCancel={onCancel}
        />
      )}
    />
  )
}
