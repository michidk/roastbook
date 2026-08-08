import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "@/components/ui/star-rating"
import { TextareaField } from "@/components/form/form-field"
import { cn } from "@/lib/utils"

type TasteTagOption = {
  readonly id: number
  readonly name: string
}

type VisitTastingFieldsProps = {
  readonly rating: number
  readonly onRatingChange: (rating: number) => void
  readonly notes: string
  readonly onNotesChange: (notes: string) => void
  readonly negativeTags: readonly TasteTagOption[]
  readonly positiveTags: readonly TasteTagOption[]
  readonly selectedTagIds: readonly number[]
  readonly onToggleTag: (tagId: number) => void
}

export function VisitTastingFields({
  rating,
  onRatingChange,
  notes,
  onNotesChange,
  negativeTags,
  positiveTags,
  selectedTagIds,
  onToggleTag,
}: VisitTastingFieldsProps) {
  return (
    <Card role="group" aria-labelledby="visit-tasting-heading">
      <CardHeader>
        <CardTitle id="visit-tasting-heading">Tasting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Rating</p>
          <StarRating
            value={rating}
            onChange={onRatingChange}
            ariaLabel="Visit rating"
          />
        </div>

        {negativeTags.length > 0 && (
          <TasteTagGroup
            id="visit-issues-label"
            label="Issues"
            labelClassName="text-destructive"
            tags={negativeTags}
            selectedTagIds={selectedTagIds}
            selectedVariant="destructive"
            hoverClassName="hover:bg-destructive/10"
            onToggleTag={onToggleTag}
          />
        )}

        {positiveTags.length > 0 && (
          <TasteTagGroup
            id="visit-positives-label"
            label="Positives"
            labelClassName="text-primary"
            tags={positiveTags}
            selectedTagIds={selectedTagIds}
            selectedVariant="default"
            hoverClassName="hover:bg-primary/10"
            onToggleTag={onToggleTag}
          />
        )}

        <TextareaField
          id="notes"
          label="Notes"
          placeholder="How was your experience?"
          value={notes}
          onChange={onNotesChange}
        />
      </CardContent>
    </Card>
  )
}

export function TasteTagGroup({
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
  readonly selectedVariant: "default" | "destructive"
  readonly hoverClassName: string
  readonly onToggleTag: (tagId: number) => void
}) {
  return (
    <div role="group" aria-labelledby={id} className="space-y-2">
      <p id={id} className={cn("text-sm font-medium", labelClassName)}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          return (
            <Badge
              key={tag.id}
              render={<button type="button" />}
              aria-pressed={isSelected}
              variant={isSelected ? selectedVariant : "outline"}
              className={cn("h-8 px-3 transition-colors", !isSelected && hoverClassName)}
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
