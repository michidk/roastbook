import { Bean as BeanIcon } from 'lucide-react'
import { BeanForm } from '@/components/beans/bean-form'
import { EntityPicker } from '@/components/form/entity-picker'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { thumbnailUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

interface BeanImage {
  readonly storagePath: string
  readonly isThumbnail: boolean
}

interface BeanOption {
  id: number
  name: string
  roaster?: string | null
  origin?: string | null
  images?: readonly BeanImage[]
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
}: BeanPickerProps) {
  return (
    <EntityPicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      items={beans}
      suggestions={suggestions}
      getKey={(bean) => bean.id}
      getLabel={(bean) => bean.name}
      getDescription={(bean) =>
        [bean.roaster, bean.origin].filter(Boolean).join(' · ') || null
      }
      renderItemLeading={(bean) => (
        <BeanThumbnail bean={bean} className="size-10" />
      )}
      renderSelectedLeading={(bean) => (
        <BeanThumbnail bean={bean} className="size-6" />
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
