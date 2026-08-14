import { CoffeeShopForm } from '@/components/coffee-shops/coffee-shop-form'
import { EntityPicker } from '@/components/form/entity-picker'

interface CoffeeShopOption {
  id: number
  name: string
  city?: string | null
  country?: string | null
}

interface CoffeeShopPickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  coffeeShops: readonly CoffeeShopOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function CoffeeShopPicker({
  id,
  label,
  value,
  onChange,
  coffeeShops,
  placeholder = 'Select a café',
  required,
  disabled,
  className,
  autoFocus,
}: CoffeeShopPickerProps) {
  return (
    <EntityPicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={coffeeShops}
      getKey={(coffeeShop) => coffeeShop.id}
      getLabel={(coffeeShop) => coffeeShop.name}
      getDescription={(coffeeShop) =>
        [coffeeShop.city, coffeeShop.country].filter(Boolean).join(', ') || null
      }
      placeholder={placeholder}
      searchPlaceholder="Search cafés…"
      emptyMessage="No matching cafés."
      createLabel={(query) => `Add “${query}” as a new café`}
      noMatchHint={(query) => `No café named “${query}” yet`}
      required={required}
      disabled={disabled}
      className={className}
      autoFocus={autoFocus}
      dialogTitle="Add café"
      dialogDescription="Create the café without leaving this form."
      renderCreateForm={({ initialName, onCreated, onCancel }) => (
        <CoffeeShopForm
          initialName={initialName}
          onCreated={(coffeeShop) =>
            onCreated({ id: coffeeShop.id, name: coffeeShop.name })
          }
          onCancel={onCancel}
        />
      )}
    />
  )
}
