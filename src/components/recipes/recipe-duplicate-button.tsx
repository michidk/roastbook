import { useNavigate, useRouter } from '@tanstack/react-router'
import { Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copyRecipe } from '@/lib/client/journal'
import { getErrorMessage } from '@/lib/error-message'

type RecipeDuplicateButtonProps = {
  readonly recipe: Parameters<typeof copyRecipe>[0]
  readonly compact?: boolean
}

export function RecipeDuplicateButton({
  recipe,
  compact = false,
}: RecipeDuplicateButtonProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDuplicate = async () => {
    if (isDuplicating) return
    setIsDuplicating(true)
    try {
      const result = await copyRecipe(recipe)
      if (result.kind === 'queued') {
        toast.success('Recipe copy saved on this device')
        await navigate({ to: '/brews/pending' })
        return
      }
      const duplicate = result.value
      await router.invalidate()
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
