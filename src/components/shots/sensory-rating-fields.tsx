import { StarRating } from '@/components/ui/star-rating'

export type SensoryValues = {
  readonly bitterness: number
  readonly acidity: number
  readonly sweetness: number
  readonly body: number
  readonly astringency: number
}

export const SENSORY_FIELDS = [
  { key: 'acidity', label: 'Acidity' },
  { key: 'sweetness', label: 'Sweetness' },
  { key: 'bitterness', label: 'Bitterness' },
  { key: 'body', label: 'Body' },
  { key: 'astringency', label: 'Astringency / Dryness' },
] as const satisfies readonly {
  readonly key: keyof SensoryValues
  readonly label: string
}[]

type SensoryRatingFieldsProps = {
  readonly values: SensoryValues
  readonly onChange: <Key extends keyof SensoryValues>(
    key: Key,
    value: number,
  ) => void
}

export function SensoryRatingFields({
  values,
  onChange,
}: SensoryRatingFieldsProps) {
  return (
    <div className="space-y-1">
      {SENSORY_FIELDS.map((field) => (
        <div
          key={field.key}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
        >
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <StarRating
            value={values[field.key]}
            onChange={(value) => onChange(field.key, value)}
            sizeClassName="size-4"
            ariaLabel={field.label}
          />
        </div>
      ))}
    </div>
  )
}
