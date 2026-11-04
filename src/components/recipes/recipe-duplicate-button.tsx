import { useNavigate } from '@tanstack/react-router'
import { Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createRecipe, type getRecipe } from '@/journal/recipes'
import { getErrorMessage } from '@/lib/error-message'
import { recipePayload } from '@/lib/new-shot-payload'
import { shotFormValuesFrom } from '@/modules/brews/shot-form-values'

type RecipeDuplicateButtonProps = {
  readonly recipe: NonNullable<Awaited<ReturnType<typeof getRecipe>>>
  readonly compact?: boolean
}

export function RecipeDuplicateButton({
  recipe,
  compact = false,
}: RecipeDuplicateButtonProps) {
  const navigate = useNavigate()
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDuplicate = async () => {
    if (isDuplicating) return
    setIsDuplicating(true)
    try {
      const duplicate = await createRecipe({
        data: {
          name: `${recipe.name} (copy)`,
          ...recipePayload(shotFormValuesFrom(recipe)),
        },
      })
      toast.success('Recipe duplicated')
      await navigate({
        to: '/recipes/$recipeId',
        params: { recipeId: String(duplicate.id) },
      })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not duplicate recipe'))
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Button
      type="button"
      variant={compact ? 'ghost' : 'outline'}
      size={compact ? 'icon' : 'sm'}
      aria-label={compact ? `Duplicate ${recipe.name}` : undefined}
      title={compact ? `Duplicate ${recipe.name}` : undefined}
      disabled={isDuplicating}
      onClick={() => void handleDuplicate()}
    >
      {isDuplicating ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <Copy aria-hidden="true" />
      )}
      {compact ? null : isDuplicating ? 'Duplicating…' : 'Duplicate'}
    </Button>
  )
}
