import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Pencil } from 'lucide-react'
import { type SyntheticEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { InputField, SelectField } from '@/components/form/form-field'
import { Page, PageHeader } from '@/components/page-layout'
import { ShotEditForm } from '@/components/shots/shot-edit-form'
import { ShotSensoryRatingFields } from '@/components/shots/shot-sensory-ratings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { StarRating } from '@/components/ui/star-rating'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { editModeSearchField } from '@/lib/edit-mode'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { getRecipeOptions, saveShotAsRecipe } from '@/lib/server/recipes'
import { deleteShot, getShot } from '@/lib/server/shots'
import { getTasteTags } from '@/lib/server/taste-tags'
import {
  hasShotSensoryRatings,
  shotSensoryRatingsFrom,
} from '@/lib/shot-sensory'
import { isNegativeTasteTag } from '@/lib/taste-tags'

export const Route = createFileRoute('/shots/$shotId')({
  validateSearch: z.object({ edit: editModeSearchField }),
  loaderDeps: ({ search }) => ({ edit: search.edit ?? false }),
  loader: async ({ params, deps }) => {
    const shotId = Number(params.shotId)
    const [shot, recipes, editData] = await Promise.all([
      getShot({ data: shotId }),
      getRecipeOptions(),
      deps.edit
        ? Promise.all([
            getActiveBeans(),
            getTasteTags(),
            getGear(),
            getBrewingMethods(),
          ]).then(([beans, tasteTags, gear, methods]) => ({
            beans,
            tasteTags,
            gear,
            methods,
          }))
        : null,
    ])
    return { shot, recipes, editData }
  },
  component: ShotDetailPage,
})

function ShotDataFields({
  fields,
  valueClassName,
}: {
  readonly fields: readonly { readonly label: string; readonly value: string }[]
  readonly valueClassName: string
}) {
  return fields.map((field) => (
    <div key={field.label}>
      <p className="text-sm text-muted-foreground">{field.label}</p>
      <p className={valueClassName}>{field.value}</p>
    </div>
  ))
}

function ShotDetailPage() {
  const formatDateTime = useDateTimeFormatter()
  const { shot, recipes, editData } = Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const formatNumber = useNumberFormatter()
  const navigate = useNavigate({ from: '/shots/$shotId' })
  const router = useRouter()

  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [recipeTarget, setRecipeTarget] = useState(
    shot?.recipe ? String(shot.recipe.id) : 'new',
  )
  const [recipeName, setRecipeName] = useState('')
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const editButtonRef = useRef<HTMLAnchorElement>(null)

  if (!shot) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Brew not found</h2>
        <Button asChild className="mt-4">
          <Link to="/shots">Back to brews</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteShot({ data: shot.id })
      navigate({ to: '/shots' })
    } catch {
      toast.error('Failed to delete brew')
    }
  }

  const handleCancel = () => {
    void navigate({ search: (current) => ({ ...current, edit: undefined }) })
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaved = async () => {
    await router.invalidate({ filter: (match) => match.routeId === Route.id })
    await navigate({ search: (current) => ({ ...current, edit: undefined }) })
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaveRecipe = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const isNewRecipe = recipeTarget === 'new'
    const name = recipeName.trim()
    if (isNewRecipe && !name) return
    setIsSavingRecipe(true)
    try {
      const recipe = await saveShotAsRecipe({
        data: isNewRecipe
          ? { shotId: shot.id, name }
          : { shotId: shot.id, recipeId: Number(recipeTarget) },
      })
      if (!recipe) {
        toast.error('Could not save this recipe')
        return
      }
      setRecipeTarget(String(recipe.id))
      setRecipeName('')
      setIsRecipeDialogOpen(false)
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
      toast.success(isNewRecipe ? 'Recipe created' : 'Recipe updated')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this recipe',
      )
    } finally {
      setIsSavingRecipe(false)
    }
  }

  const ratioNumerator =
    shot.ratioBasis === 'brew_water' ? shot.brewWaterGrams : shot.yieldGrams
  const ratio =
    shot.doseGrams && ratioNumerator
      ? (Number(ratioNumerator) / Number(shot.doseGrams)).toFixed(1)
      : null
  const methodParameters = shot.brewingMethod.enabledParameters

  const extractionMetrics = [
    methodParameters.includes('doseGrams') && shot.doseGrams
      ? { label: 'Dose', value: `${formatNumber(shot.doseGrams)} g` }
      : null,
    methodParameters.includes('yieldGrams') && shot.yieldGrams
      ? { label: 'Yield', value: `${formatNumber(shot.yieldGrams)} g` }
      : null,
    methodParameters.includes('yieldGrams') && ratio
      ? { label: 'Ratio', value: `1:${formatNumber(ratio)}` }
      : null,
    methodParameters.includes('shotTimeSeconds') &&
    shot.shotTimeSeconds !== null
      ? { label: 'Time', value: `${formatNumber(shot.shotTimeSeconds)} s` }
      : null,
  ].filter((field) => field !== null)
  const extractionDetails = [
    methodParameters.includes('grindSetting') && shot.grindSetting?.trim()
      ? { label: 'Grind', value: shot.grindSetting }
      : null,
    methodParameters.includes('brewTemperatureCelsius') &&
    shot.brewTemperatureCelsius
      ? {
          label: 'Temperature',
          value: `${formatNumber(shot.brewTemperatureCelsius)} °C`,
        }
      : null,
    methodParameters.includes('brewPressureBar') && shot.brewPressureBar
      ? {
          label: 'Pressure',
          value: `${formatNumber(shot.brewPressureBar)} bar`,
        }
      : null,
  ].filter((field) => field !== null)
  const hasTasteTags = shot.tasteTags.length > 0
  const hasNotes = Boolean(shot.notes?.trim())
  const sensoryRatings = shotSensoryRatingsFrom(shot)
  const hasSensoryRatings = hasShotSensoryRatings(shot)
  const hasTasting = Boolean(
    shot.rating || hasSensoryRatings || hasTasteTags || hasNotes,
  )
  const availableRecipes = recipes.filter(
    (recipe) => recipe.brewingMethodId === shot.brewingMethodId,
  )

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={shot.bean?.name || 'Unknown beans'}
        description={
          <time dateTime={new Date(shot.brewedAt).toISOString()}>
            {shot.brewingMethod.name} · {formatDateTime(shot.brewedAt)}
          </time>
        }
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/shots" aria-label="Back to brews">
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <>
            {!isEditing && (
              <>
                <Dialog
                  open={isRecipeDialogOpen}
                  onOpenChange={setIsRecipeDialogOpen}
                >
                  <DialogTrigger
                    render={<Button variant="outline" size="sm" />}
                  >
                    <BookOpen />
                    Save to recipe
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save shot values to a recipe</DialogTitle>
                      <DialogDescription>
                        Save this brew’s method, equipment, and recipe values
                        for reuse.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={handleSaveRecipe}
                      className="grid min-h-0 grid-rows-[1fr_auto]"
                    >
                      <DialogBody>
                        <SelectField
                          id="recipe-target"
                          label="Save values to"
                          value={recipeTarget}
                          onChange={setRecipeTarget}
                          options={[
                            { value: 'new', label: 'A new recipe' },
                            ...availableRecipes.map((recipe) => ({
                              value: String(recipe.id),
                              label:
                                recipe.id === shot.recipe?.id
                                  ? `${recipe.name} (used for this shot)`
                                  : recipe.name,
                            })),
                          ]}
                        />
                        {recipeTarget === 'new' ? (
                          <InputField
                            id="recipe-name"
                            label="Recipe name"
                            value={recipeName}
                            onChange={setRecipeName}
                            autoFocus
                            required
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            The selected recipe’s current values will be
                            replaced. Its name will stay the same.
                          </p>
                        )}
                      </DialogBody>
                      <DialogFooter>
                        <DialogClose
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isSavingRecipe}
                            />
                          }
                        >
                          Cancel
                        </DialogClose>
                        <Button
                          type="submit"
                          disabled={
                            (recipeTarget === 'new' && !recipeName.trim()) ||
                            isSavingRecipe
                          }
                          aria-busy={isSavingRecipe}
                        >
                          {isSavingRecipe
                            ? 'Saving…'
                            : recipeTarget === 'new'
                              ? 'Create recipe'
                              : 'Update recipe'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    ref={editButtonRef}
                    to="/shots/$shotId"
                    params={{ shotId: String(shot.id) }}
                    search={(current) => ({ ...current, edit: true })}
                  >
                    <Pencil />
                    Edit
                  </Link>
                </Button>
              </>
            )}
            <DeleteConfirmation
              title="Delete this brew?"
              description="This action cannot be undone."
              onConfirm={handleDelete}
            />
          </>
        }
      />

      {shot.recipe ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Brewed from{' '}
          <Link
            to="/recipes/$recipeId"
            params={{ recipeId: String(shot.recipe.id) }}
            className="inline-flex min-h-11 items-center rounded-md font-semibold text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
          >
            {shot.recipe.name}
          </Link>
        </p>
      ) : null}

      {isEditing && editData ? (
        <ShotEditForm
          shot={shot}
          editData={editData}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      ) : (
        <>
          {(extractionMetrics.length > 0 || extractionDetails.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Extraction</CardTitle>
              </CardHeader>
              <CardContent>
                {extractionMetrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <ShotDataFields
                      fields={extractionMetrics}
                      valueClassName="text-xl font-semibold"
                    />
                  </div>
                )}

                {extractionMetrics.length > 0 &&
                  extractionDetails.length > 0 && (
                    <Separator className="my-4" />
                  )}

                {extractionDetails.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <ShotDataFields
                      fields={extractionDetails}
                      valueClassName="font-medium"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {hasTasting && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle as="h2">Tasting</CardTitle>
                  {shot.rating && (
                    <StarRating value={shot.rating} variant="compact" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasSensoryRatings ? (
                  <ShotSensoryRatingFields values={sensoryRatings} readOnly />
                ) : null}

                {hasTasteTags && (
                  <div className="flex flex-wrap gap-2">
                    {shot.tasteTags.map((tt) => (
                      <Badge
                        key={tt.id}
                        title={tt.tasteTag.hint ?? undefined}
                        variant={
                          isNegativeTasteTag(tt.tasteTag)
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {tt.tasteTag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {hasNotes && (
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{shot.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Page>
  )
}
