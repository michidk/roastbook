import { BookOpen } from 'lucide-react'
import { type ReactElement, type SyntheticEvent, useState } from 'react'
import { InputField, SelectField } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export type SaveToRecipeTarget =
  | { readonly kind: 'new'; readonly name: string }
  | { readonly kind: 'update'; readonly recipeId: number }

type SaveToRecipeDialogProps = {
  /** Button element rendered as the dialog trigger. */
  readonly trigger: ReactElement
  readonly triggerLabel: string
  readonly title: string
  readonly description: string
  readonly availableRecipes: readonly {
    readonly id: number
    readonly name: string
  }[]
  /** Transient template to preselect, such as the recipe loaded into a draft. */
  readonly defaultRecipeId?: number
  /** Marker shown after the default recipe's name, e.g. "loaded". */
  readonly defaultRecipeHint?: string
  readonly nameLabel: string
  readonly submitLabel: string
  /** Label while an existing recipe is targeted; defaults to `submitLabel`. */
  readonly updateSubmitLabel?: string
  readonly isSubmitting: boolean
  /** Resolves whether the save succeeded; success closes the dialog. */
  readonly onSubmit: (target: SaveToRecipeTarget) => Promise<boolean>
}

const targetFor = (defaultRecipeId: number | undefined) =>
  defaultRecipeId === undefined ? 'new' : String(defaultRecipeId)

/**
 * Dialog that saves a brew's values into a new recipe or replaces an
 * existing recipe's values. Used by the new-brew form and the brew detail
 * page.
 */
export function SaveToRecipeDialog({
  trigger,
  triggerLabel,
  title,
  description,
  availableRecipes,
  defaultRecipeId,
  defaultRecipeHint,
  nameLabel,
  submitLabel,
  updateSubmitLabel,
  isSubmitting,
  onSubmit,
}: SaveToRecipeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recipeTarget, setRecipeTarget] = useState(() =>
    targetFor(defaultRecipeId),
  )
  const [recipeName, setRecipeName] = useState('')
  const [lastDefaultRecipeId, setLastDefaultRecipeId] =
    useState(defaultRecipeId)
  if (lastDefaultRecipeId !== defaultRecipeId) {
    // The draft loaded a different template, so retarget the dialog and drop
    // a stale new-recipe name without implying a persisted relationship.
    setLastDefaultRecipeId(defaultRecipeId)
    setRecipeTarget(targetFor(defaultRecipeId))
    setRecipeName('')
  }

  const isNewRecipe = recipeTarget === 'new'

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const name = recipeName.trim()
    if (isNewRecipe && !name) return
    const saved = await onSubmit(
      isNewRecipe
        ? { kind: 'new', name }
        : { kind: 'update', recipeId: Number(recipeTarget) },
    )
    if (saved) {
      setRecipeName('')
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger}>
        <BookOpen />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="grid min-h-0 grid-rows-[1fr_auto]"
        >
          <DialogBody>
            <SelectField
              id="save-recipe-target"
              label="Save values to"
              value={recipeTarget}
              onChange={setRecipeTarget}
              options={[
                { value: 'new', label: 'A new recipe' },
                ...availableRecipes.map((recipe) => ({
                  value: String(recipe.id),
                  label:
                    recipe.id === defaultRecipeId && defaultRecipeHint
                      ? `${recipe.name} (${defaultRecipeHint})`
                      : recipe.name,
                })),
              ]}
            />
            {isNewRecipe ? (
              <InputField
                id="save-recipe-name"
                label={nameLabel}
                value={recipeName}
                onChange={setRecipeName}
                required
                autoFocus
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                The selected recipe’s current values will be replaced. Its name
                will stay the same.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={(isNewRecipe && !recipeName.trim()) || isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting
                ? 'Saving…'
                : isNewRecipe
                  ? submitLabel
                  : (updateSubmitLabel ?? submitLabel)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
