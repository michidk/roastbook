import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StarRating } from "@/components/ui/star-rating"
import { Textarea } from "@/components/ui/textarea"
import { TasteTagGroup } from "@/components/visits/visit-tasting-fields"

type TasteTagOption = {
  readonly id: number
  readonly name: string
}

type ShotTastingFieldsProps = {
  readonly rating: number
  readonly onRatingChange: (rating: number) => void
  readonly notes: string
  readonly onNotesChange: (notes: string) => void
  readonly negativeTags: readonly TasteTagOption[]
  readonly positiveTags: readonly TasteTagOption[]
  readonly selectedTagIds: readonly number[]
  readonly onToggleTag: (tagId: number) => void
}

export function ShotTastingFields({
  rating,
  onRatingChange,
  notes,
  onNotesChange,
  negativeTags,
  positiveTags,
  selectedTagIds,
  onToggleTag,
}: ShotTastingFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasting Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Rating</p>
          <StarRating value={rating} onChange={onRatingChange} ariaLabel="Shot rating" />
        </div>

        {negativeTags.length > 0 && (
          <TasteTagGroup
            id="shot-issues-label"
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
            id="shot-positives-label"
            label="Positives"
            labelClassName="text-primary"
            tags={positiveTags}
            selectedTagIds={selectedTagIds}
            selectedVariant="default"
            hoverClassName="hover:bg-primary/10"
            onToggleTag={onToggleTag}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="How was it? Any observations?"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
