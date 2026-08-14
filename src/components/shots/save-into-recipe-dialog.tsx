import { BookOpen } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
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
import type { RecipeTarget } from '@/lib/recipe-target'

type RecipeOption = {
  readonly id: number
  readonly name: string
  readonly brewingMethodId: number
}

type SaveIntoRecipeDialogProps = {
  readonly recipes: readonly RecipeOption[]
  readonly brewingMethodId: number
  readonly currentRecipeId?: number | null
  readonly onSave: (target: RecipeTarget) => Promise<void>
  readonly disabled?: boolean
  readonly className?: string
  readonly size?: 'sm' | 'lg'
}

const NEW_RECIPE_VALUE = 'new'

export function SaveIntoRecipeDialog({
  recipes,
  brewingMethodId,
  currentRecipeId,
  onSave,
  disabled,
  className,
  size = 'sm',
}: SaveIntoRecipeDialogProps) {
  const availableRecipes = recipes.filter(
    (recipe) => recipe.brewingMethodId === brewingMethodId,
  )
  const initialTarget =
    currentRecipeId &&
    availableRecipes.some((recipe) => recipe.id === currentRecipeId)
      ? String(currentRecipeId)
      : NEW_RECIPE_VALUE
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState(initialTarget)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isNewRecipe = target === NEW_RECIPE_VALUE

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTarget(initialTarget)
      setName('')
    }
    setOpen(nextOpen)
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const recipeName = name.trim()
    if (isNewRecipe && !recipeName) return

    setIsSaving(true)
    try {
      await onSave(
        isNewRecipe ? { name: recipeName } : { recipeId: Number(target) },
      )
      setOpen(false)
      toast.success(
        isNewRecipe ? 'Brew saved into a new recipe' : 'Recipe updated',
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save this brew into a recipe',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            className={className}
            disabled={disabled}
          />
        }
      >
        <BookOpen />
        Save into recipe
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save into recipe</DialogTitle>
          <DialogDescription>
            Store this brew’s method, beans, equipment, and brewing values in a
            new or existing recipe.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="grid min-h-0 grid-rows-[1fr_auto]"
        >
          <DialogBody className="space-y-4">
            <SelectField
              id="save-into-recipe-target"
              label="Recipe"
              value={target}
              onChange={setTarget}
              options={[
                { value: NEW_RECIPE_VALUE, label: 'Create new recipe' },
                ...availableRecipes.map((recipe) => ({
                  value: String(recipe.id),
                  label:
                    recipe.id === currentRecipeId
                      ? `${recipe.name} (used for this brew)`
                      : recipe.name,
                })),
              ]}
            />
            {isNewRecipe ? (
              <InputField
                id="save-into-recipe-name"
                label="New recipe name"
                value={name}
                onChange={setName}
                autoFocus
                required
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Saving replaces that recipe’s brewing values with the values
                from this brew.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isSaving} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={(isNewRecipe && !name.trim()) || isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save into recipe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
