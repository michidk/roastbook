import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { EntityNotFound } from '@/components/entity-not-found'
import { Page, PageHeader } from '@/components/page-layout'
import { RecipeDuplicateButton } from '@/components/recipes/recipe-duplicate-button'
import { RecipeFields } from '@/components/recipes/recipe-fields'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import {
  EMPTY_SHOT_FORM_VALUES,
  type ShotFormValues,
  shotFormValuesFrom,
} from '@/components/shots/shot-parameter-fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { getErrorMessage } from '@/lib/error-message'
import { shotParameterPayload } from '@/lib/new-shot-payload'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { deleteRecipe, getRecipe, updateRecipe } from '@/lib/server/recipes'
import { getShotUpdateErrors } from '@/lib/update-validation'

export const Route = createFileRoute('/recipes/$recipeId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loader: async ({ params }) => {
    const recipeId = parseIdParam(params.recipeId)
    const [recipe, beans, methods, gear] = await Promise.all([
      getRecipe({ data: recipeId }),
      getActiveBeans(),
      getBrewingMethods(),
      getGear(),
    ])
    return { recipe, beans, methods, gear }
  },
  component: RecipeDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})

type Recipe = NonNullable<Awaited<ReturnType<typeof getRecipe>>>

function createFormValues(recipe?: Recipe): ShotFormValues {
  return recipe
    ? { ...shotFormValuesFrom(recipe), rating: 0, notes: '' }
    : { ...EMPTY_SHOT_FORM_VALUES, rating: 0 }
}

function RecipeDetailPage() {
  const { recipe, beans, methods, gear } = Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const navigate = useNavigate({ from: '/recipes/$recipeId' })
  const router = useRouter()
  const [name, setName] = useState(recipe?.name ?? '')
  const [values, setValues] = useState(() => createFormValues(recipe))
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})

  useEffect(() => {
    if (!recipe) return
    setName(recipe.name)
    setValues(createFormValues(recipe))
  }, [recipe])

  const recipeUpdateData = () =>
    recipe ? { id: recipe.id, name, ...shotParameterPayload(values) } : null

  const { isSubmitting: isSaving, handleSubmit: handleSave } =
    useFormSubmission({
      canSubmit: () => {
        const data = recipeUpdateData()
        if (!data) return false
        const errors = getShotUpdateErrors(data)
        setFieldErrors(errors)
        return Boolean(name.trim()) && Object.keys(errors).length === 0
      },
      submit: async () => {
        const data = recipeUpdateData()
        if (!data) return
        await updateRecipe({ data })
        await navigate({
          search: (current) => ({ ...current, edit: undefined }),
          replace: true,
        })
        await router.invalidate()
        toast.success('Recipe updated')
      },
      onError: (error) =>
        toast.error(getErrorMessage(error, 'Could not update recipe')),
    })

  if (!recipe) {
    return (
      <EntityNotFound
        entity="Recipe"
        backTo="/recipes"
        backLabel="Back to recipes"
      />
    )
  }

  const beanOptions =
    recipe.bean && !beans.some((bean) => bean.id === recipe.bean?.id)
      ? [recipe.bean, ...beans]
      : beans
  const set = <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const cancelEdit = async () => {
    setName(recipe.name)
    setValues(createFormValues(recipe))
    setFieldErrors({})
    await navigate({
      search: (current) => ({ ...current, edit: undefined }),
      replace: true,
    })
  }

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={recipe.name}
        description={
          <Badge variant="outline">{recipe.brewingMethod.name}</Badge>
        }
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/recipes" aria-label="Back to recipes">
              <ArrowLeft />
            </Link>
          </Button>
        }
        actions={
          isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => void cancelEdit()}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                form="recipe-edit-form"
                disabled={isSaving || !name.trim() || !values.brewingMethodId}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : (
            <>
              <RecipeDuplicateButton recipe={recipe} />
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/recipes/$recipeId"
                  params={{ recipeId: String(recipe.id) }}
                  search={(current) => ({ ...current, edit: true })}
                >
                  <Pencil /> Edit
                </Link>
              </Button>
              <DeleteConfirmation
                title="Delete this recipe?"
                description="This template will be removed permanently. Existing brews keep their copied values and are not affected."
                onConfirm={async () => {
                  await deleteRecipe({ data: recipe.id })
                  await router.invalidate()
                  toast.success('Recipe deleted')
                  await navigate({ to: '/recipes' })
                }}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
                    aria-label="Delete recipe"
                  >
                    <Trash2 />
                  </Button>
                }
              />
            </>
          )
        }
      />

      {isEditing ? (
        <form
          id="recipe-edit-form"
          onSubmit={handleSave}
          className="space-y-5 sm:space-y-6"
        >
          <RecipeFields
            name={name}
            values={values}
            beans={beanOptions}
            methods={methods}
            gear={gear}
            errors={fieldErrors}
            onNameChange={setName}
            onChange={set}
          />
        </form>
      ) : (
        <RecipeSummary recipe={recipe} gear={gear} />
      )}
    </Page>
  )
}

function RecipeSummary({
  recipe,
  gear,
}: {
  recipe: Recipe
  gear: Awaited<ReturnType<typeof getGear>>
}) {
  const formatNumber = useNumberFormatter()
  const enabled = new Set(recipe.brewingMethod.enabledParameters)
  const rows = [
    enabled.has('doseGrams') && [
      'Dose',
      recipe.doseGrams && `${formatNumber(recipe.doseGrams)} g`,
    ],
    enabled.has('brewWaterGrams') && [
      'Brew water',
      recipe.brewWaterGrams && `${formatNumber(recipe.brewWaterGrams)} g`,
    ],
    enabled.has('yieldGrams') && [
      'Yield',
      recipe.yieldGrams && `${formatNumber(recipe.yieldGrams)} g`,
    ],
    enabled.has('shotTimeSeconds') && [
      'Brew time',
      recipe.shotTimeSeconds && `${formatNumber(recipe.shotTimeSeconds)} s`,
    ],
    enabled.has('targetTimeSeconds') && [
      'Target time',
      recipe.targetTimeSeconds && `${formatNumber(recipe.targetTimeSeconds)} s`,
    ],
    enabled.has('grindSetting') && ['Grind setting', recipe.grindSetting],
    enabled.has('brewTemperatureCelsius') && [
      'Temperature',
      recipe.brewTemperatureCelsius &&
        `${formatNumber(recipe.brewTemperatureCelsius)} °C`,
    ],
    enabled.has('brewPressureBar') && [
      'Brew pressure',
      recipe.brewPressureBar && `${formatNumber(recipe.brewPressureBar)} bar`,
    ],
    enabled.has('flowRateMlPerSecond') && [
      'Flow rate',
      recipe.flowRateMlPerSecond &&
        `${formatNumber(recipe.flowRateMlPerSecond)} mL/s`,
    ],
    enabled.has('preinfusionTimeSeconds') && [
      'Pre-infusion',
      recipe.preinfusionTimeSeconds &&
        `${formatNumber(recipe.preinfusionTimeSeconds)} s`,
    ],
    enabled.has('bloomTimeSeconds') && [
      'Bloom',
      recipe.bloomTimeSeconds && `${formatNumber(recipe.bloomTimeSeconds)} s`,
    ],
  ].filter(Boolean) as [string, string | null][]
  const accessories = gear.filter((item) =>
    recipe.accessoryGearIds.includes(item.id),
  )
  const equipment = [
    recipe.machine,
    recipe.grinder,
    recipe.basket,
    ...accessories,
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(
      (item, index, items) =>
        items.findIndex(({ id }) => id === item.id) === index,
    )

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Brewing method</p>
            <p className="font-medium">{recipe.brewingMethod.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Beans</p>
            <p className="font-medium">{recipe.bean?.name ?? 'Any beans'}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recipe values</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value || 'Not set'}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground">No brewing values saved.</p>
          )}
        </CardContent>
      </Card>
      {equipment.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {equipment.map((item) => (
              <div key={item.id}>
                <p className="text-sm text-muted-foreground">
                  {item.type === 'espresso_machine_with_grinder'
                    ? 'Machine / grinder'
                    : item.type === 'grinder'
                      ? 'Grinder'
                      : item.type === 'basket'
                        ? 'Basket'
                        : item.type === 'espresso_machine' ||
                            item.type === 'brewer'
                          ? 'Brewer / machine'
                          : 'Accessory'}
                </p>
                <p className="font-medium">{item.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
