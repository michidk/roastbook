import { Button } from '@roastbook/ui/button'
import { Label } from '@roastbook/ui/label'
import { StarRating } from '@roastbook/ui/star-rating'
import { Switch } from '@roastbook/ui/switch'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { BeanFormValues } from '@/components/beans/bean-form-values'
import { TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { getBeanTags } from '@/journal/bean-tags'
import { getErrorMessage } from '@/lib/error-message'

type Props = {
  values: BeanFormValues
  onChange: <Key extends keyof BeanFormValues>(
    key: Key,
    value: BeanFormValues[Key],
  ) => void
  idPrefix?: string
  allowBagCreation?: boolean
}

export function BeanLibraryFields({
  values,
  onChange,
  idPrefix = 'bean',
  allowBagCreation = false,
}: Props) {
  const [tags, setTags] = useState<Awaited<ReturnType<typeof getBeanTags>>>([])
  const [tagError, setTagError] = useState(false)
  const loadTags = () => {
    setTagError(false)
    void getBeanTags()
      .then(setTags)
      .catch((error) => {
        setTagError(true)
        toast.error(getErrorMessage(error, 'Could not load bean tags'))
      })
  }
  useEffect(loadTags, [])
  return (
    <FormSection title="Your collection">
      {allowBagCreation ? (
        <Toggle
          id={`${idPrefix}-create-bag`}
          label="Create and track a bag"
          checked={values.createBag}
          onChange={(value) => onChange('createBag', value)}
        />
      ) : null}
      <Toggle
        id={`${idPrefix}-always-on-shelf`}
        label="Always on shelf"
        checked={values.alwaysOnShelf}
        onChange={(value) => onChange('alwaysOnShelf', value)}
      />
      <p className="text-sm text-muted-foreground">
        Keep this coffee on your shelf without tracking individual bags.
      </p>
      <div className="space-y-2">
        <p className="text-sm font-medium">Your bean rating</p>
        <StarRating
          value={values.rating}
          onChange={(value) => onChange('rating', value)}
          ariaLabel="Personal bean rating"
        />
        <p className="text-sm text-muted-foreground">
          Leave unset to use the average of rated brews. Select the same star
          again to clear.
        </p>
      </div>
      <TextareaField
        id={`${idPrefix}-rating-note`}
        label="Rating note"
        value={values.ratingNote}
        onChange={(value) => onChange('ratingNote', value)}
        rows={2}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">Bean tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Button
              key={tag.id}
              type="button"
              variant={
                values.beanTagIds.includes(tag.id) ? 'default' : 'outline'
              }
              size="sm"
              aria-pressed={values.beanTagIds.includes(tag.id)}
              onClick={() =>
                onChange(
                  'beanTagIds',
                  values.beanTagIds.includes(tag.id)
                    ? values.beanTagIds.filter((id) => id !== tag.id)
                    : [...values.beanTagIds, tag.id],
                )
              }
            >
              {tag.name}
            </Button>
          ))}
        </div>
        {tagError ? (
          <Button type="button" variant="outline" onClick={loadTags}>
            Retry loading tags
          </Button>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create bean tags in Settings, under Taste profile.
          </p>
        ) : null}
      </div>
    </FormSection>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
