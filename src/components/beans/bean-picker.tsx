import { Bean as BeanIcon } from 'lucide-react'
import { BeanForm } from '@/components/beans/bean-form'
import { EntityPicker } from '@/components/form/entity-picker'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { beanPurchaseKey } from '@/lib/bean-selection'
import { thumbnailUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

interface BeanImage {
  readonly storagePath: string
  readonly isThumbnail: boolean
}

interface BeanOption {
  id: number
  purchaseId?: number | null
  name: string
  roaster?: string | null
  origin?: string | null
  images?: readonly BeanImage[]
  roastDate?: Date | string | null
  weight?: string | null
  usedWeightGrams?: string | null
}

interface BeanPickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  beans: readonly BeanOption[]
  suggestions?: readonly BeanOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  autoFocus?: boolean
  createAsArchived?: boolean
  byPurchase?: boolean
}

export function BeanPicker({
  id,
  label,
  value,
  onChange,
  beans,
  suggestions,
  placeholder = 'Select beans',
  required,
  disabled,
  className,
  autoFocus,
  createAsArchived = false,
  byPurchase = false,
}: BeanPickerProps) {
  const key = (bean: BeanOption) =>
    byPurchase ? beanPurchaseKey(bean) : String(bean.id)
  const hydratedSuggestions = suggestions?.map((suggestion) => {
    const suggestionKey = key(suggestion)
    return beans.find((bean) => key(bean) === suggestionKey) ?? suggestion
  })

  return (
    <EntityPicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={beans}
      suggestions={hydratedSuggestions}
      getKey={key}
      getLabel={(bean) => bean.name}
      getDescription={(bean) =>
        [
          bean.roaster,
          bean.origin,
          bean.roastDate
            ? `Roasted ${new Date(bean.roastDate).toISOString().slice(0, 10)}`
            : null,
          remainingWeightLabel(bean),
        ]
          .filter(Boolean)
          .join(' · ') || null
      }
      renderItemLeading={(bean) => (
        <BeanThumbnail bean={bean} className="size-10" />
      )}
      renderSelectedLeading={(bean) => (
        <BeanThumbnail bean={bean} className="size-6" />
      )}
      renderSuggestionLeading={(bean) => (
        <BeanThumbnail bean={bean} className="size-8" />
      )}
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
      dialogDescription={
        createAsArchived
          ? 'Save this coffee without a bag or adding it to your shelf.'
          : 'Create the bag of beans without leaving this form.'
      }
      renderCreateForm={({ initialName, onCreated, onCancel }) => (
        <BeanForm
          initialName={initialName}
          isArchived={createAsArchived}
          onCreated={(bean) =>
            onCreated({
              id: byPurchase ? beanPurchaseKey(bean) : bean.id,
              name: bean.name,
            })
          }
          onCancel={onCancel}
        />
      )}
    />
  )
}

function remainingWeightLabel(bean: BeanOption) {
  const initial = Number(bean.weight)
  if (!Number.isFinite(initial) || initial <= 0) return null
  const used = Number(bean.usedWeightGrams ?? 0)
  return `${Math.max(0, initial - (Number.isFinite(used) ? used : 0)).toFixed(0)} g left`
}

function BeanThumbnail({
  bean,
  className,
}: {
  readonly bean: BeanOption
  readonly className: string
}) {
  const image =
    bean.images?.find((candidate) => candidate.isThumbnail) ?? bean.images?.[0]

  return (
    <ImageWithFallback
      src={image ? thumbnailUrl(image.storagePath) : undefined}
      alt=""
      loading="lazy"
      decoding="async"
      width={40}
      height={40}
      className={cn(
        'shrink-0 rounded-md border border-border object-cover',
        className,
      )}
      fallback={<BeanIcon className="size-4" strokeWidth={1.5} />}
    />
  )
}
