import type { ComponentType } from 'react'
import { TextareaField } from '@/components/form/form-field'
import { ShotSensoryRatingFields } from '@/components/shots/shot-sensory-ratings'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { StarRating } from '@/components/ui/star-rating'
import { Textarea } from '@/components/ui/textarea'
import type {
  ShotSensoryRatingKey,
  ShotSensoryRatings,
} from '@/lib/shot-sensory'
import { cn } from '@/lib/utils'

type TasteTagOption = {
  readonly id: number
  readonly name: string
}

type NotesFieldProps = {
  readonly notes: string
  readonly onNotesChange: (notes: string) => void
}

type TastingKind = 'shot' | 'visit'

type ValueControl<T> = {
  readonly value: T
  readonly onChange: (value: T) => void
}

type TasteTagControl = {
  readonly options: readonly TasteTagOption[]
  readonly selectedIds: readonly number[]
  readonly onToggle: (tagId: number) => void
}

type SensoryControl = {
  readonly values: ShotSensoryRatings
  readonly onChange: (key: ShotSensoryRatingKey, value: number) => void
}

type TastingFieldsProps = {
  readonly kind: TastingKind
  readonly rating: ValueControl<number>
  readonly notes: ValueControl<string>
  readonly tags: TasteTagControl
  readonly sensory?: SensoryControl
}

const TASTING_CONFIG = {
  shot: {
    heading: 'Tasting',
    headingId: undefined,
    ratingLabel: 'Brew rating',
  },
  visit: {
    heading: 'Tasting',
    headingId: 'visit-tasting-heading',
    ratingLabel: 'Visit rating',
  },
} as const

const NOTES_FIELDS: Record<TastingKind, ComponentType<NotesFieldProps>> = {
  shot: ShotNotesField,
  visit: VisitNotesField,
}

export function TastingFields({
  kind,
  rating,
  notes,
  tags,
  sensory,
}: TastingFieldsProps) {
  const config = TASTING_CONFIG[kind]
  const NotesField = NOTES_FIELDS[kind]
  const idPrefix = kind === 'shot' ? 'shot' : 'visit'

  return (
    <Card
      role={config.headingId ? 'group' : undefined}
      aria-labelledby={config.headingId}
    >
      <CardHeader>
        <CardTitle id={config.headingId}>{config.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-sm font-medium">Overall rating</span>
            <StarRating
              value={rating.value}
              onChange={rating.onChange}
              sizeClassName="size-5"
              ariaLabel={config.ratingLabel}
            />
          </div>

          {sensory ? (
            <ShotSensoryRatingFields
              values={sensory.values}
              onChange={sensory.onChange}
            />
          ) : null}
        </div>

        {tags.options.length > 0 ? (
          <TasteTags
            id={`${idPrefix}-tags-label`}
            tags={tags.options}
            selectedTagIds={tags.selectedIds}
            onToggleTag={tags.onToggle}
          />
        ) : null}

        <NotesField notes={notes.value} onNotesChange={notes.onChange} />
      </CardContent>
    </Card>
  )
}

function TasteTags({
  id,
  tags,
  selectedTagIds,
  onToggleTag,
}: {
  readonly id: string
  readonly tags: readonly TasteTagOption[]
  readonly selectedTagIds: readonly number[]
  readonly onToggleTag: (tagId: number) => void
}) {
  return (
    <fieldset className="min-w-0 space-y-2 border-0 p-0">
      <legend id={id} className="text-sm font-medium">
        Flavor tags
      </legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          return (
            <Badge
              key={tag.id}
              render={<button type="button" />}
              aria-pressed={isSelected}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'min-h-11 px-3 py-2 transition-colors [@media(hover:hover)_and_(pointer:fine)]:min-h-8 [@media(hover:hover)_and_(pointer:fine)]:py-0',
                !isSelected && 'hover:bg-primary/10',
              )}
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </Badge>
          )
        })}
      </div>
    </fieldset>
  )
}

function ShotNotesField({ notes, onNotesChange }: NotesFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">Tasting notes</Label>
      <Textarea
        id="notes"
        placeholder="How was it? Any observations?"
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
      />
    </div>
  )
}

function VisitNotesField({ notes, onNotesChange }: NotesFieldProps) {
  return (
    <TextareaField
      id="notes"
      label="Notes"
      placeholder="How was your experience?"
      value={notes}
      onChange={onNotesChange}
    />
  )
}
