import type { ComponentType } from 'react'
import { TextareaField } from '@/components/form/form-field'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { StarRating } from '@/components/ui/star-rating'
import { Textarea } from '@/components/ui/textarea'
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
  readonly negative: readonly TasteTagOption[]
  readonly positive: readonly TasteTagOption[]
  readonly selectedIds: readonly number[]
  readonly onToggle: (tagId: number) => void
}

type TastingFieldsProps = {
  readonly kind: TastingKind
  readonly rating: ValueControl<number>
  readonly notes: ValueControl<string>
  readonly tags: TasteTagControl
}

const TASTING_CONFIG = {
  shot: {
    heading: 'Tasting Notes',
    headingId: undefined,
    ratingLabel: 'Shot rating',
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Rating</p>
          <StarRating
            value={rating.value}
            onChange={rating.onChange}
            ariaLabel={config.ratingLabel}
          />
        </div>

        <TasteTags
          idPrefix={idPrefix}
          negativeTags={tags.negative}
          positiveTags={tags.positive}
          selectedTagIds={tags.selectedIds}
          onToggleTag={tags.onToggle}
        />

        <NotesField notes={notes.value} onNotesChange={notes.onChange} />
      </CardContent>
    </Card>
  )
}

function TasteTags({
  idPrefix,
  negativeTags,
  positiveTags,
  selectedTagIds,
  onToggleTag,
}: {
  readonly idPrefix: TastingKind
  readonly negativeTags: readonly TasteTagOption[]
  readonly positiveTags: readonly TasteTagOption[]
  readonly selectedTagIds: readonly number[]
  readonly onToggleTag: (tagId: number) => void
}) {
  return (
    <>
      {negativeTags.length > 0 ? (
        <TasteTagGroup
          id={`${idPrefix}-issues-label`}
          label="Issues"
          labelClassName="text-destructive-text"
          tags={negativeTags}
          selectedTagIds={selectedTagIds}
          selectedVariant="destructive"
          hoverClassName="hover:bg-destructive/10"
          onToggleTag={onToggleTag}
        />
      ) : null}
      {positiveTags.length > 0 ? (
        <TasteTagGroup
          id={`${idPrefix}-positives-label`}
          label="Positives"
          labelClassName="text-link"
          tags={positiveTags}
          selectedTagIds={selectedTagIds}
          selectedVariant="default"
          hoverClassName="hover:bg-primary/10"
          onToggleTag={onToggleTag}
        />
      ) : null}
    </>
  )
}

function TasteTagGroup({
  id,
  label,
  labelClassName,
  tags,
  selectedTagIds,
  selectedVariant,
  hoverClassName,
  onToggleTag,
}: {
  readonly id: string
  readonly label: string
  readonly labelClassName: string
  readonly tags: readonly TasteTagOption[]
  readonly selectedTagIds: readonly number[]
  readonly selectedVariant: 'default' | 'destructive'
  readonly hoverClassName: string
  readonly onToggleTag: (tagId: number) => void
}) {
  return (
    <fieldset className="min-w-0 space-y-2 border-0 p-0">
      <legend id={id} className={cn('text-sm font-medium', labelClassName)}>
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          return (
            <Badge
              key={tag.id}
              render={<button type="button" />}
              aria-pressed={isSelected}
              variant={isSelected ? selectedVariant : 'outline'}
              className={cn(
                'h-8 px-3 transition-colors',
                !isSelected && hoverClassName,
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
      <Label htmlFor="notes">Notes</Label>
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
