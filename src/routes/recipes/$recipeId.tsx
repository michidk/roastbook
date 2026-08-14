import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { type SyntheticEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BeanPicker } from '@/components/beans/bean-picker'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { InputField, SelectField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import {
  availableGearForShot,
  type ShotFormValues,
  ShotParameterFields,
  shotFormValuesFrom,
} from '@/components/shots/shot-parameter-fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { shotParameterPayload } from '@/lib/new-shot-payload'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { deleteRecipe, getRecipe, updateRecipe } from '@/lib/server/recipes'
import { getShotUpdateErrors } from '@/lib/update-validation'

export const Route = createFileRoute('/recipes/$recipeId')({
  loader: async ({ params }) => {
    const recipeId = Number(params.recipeId)
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
    : {
        brewingMethodId: '',
        beanId: '',
        machineId: '',
        doseGrams: '',
        brewWaterGrams: '',
        ratioBasis: '',
        grinderId: '',
        grindSetting: '',
        yieldGrams: '',
        shotTimeSeconds: '',
        brewTemperatureCelsius: '',
        preinfusionTimeSeconds: '',
        preinfusionPressureBar: '',
        bloomTimeSeconds: '',
        brewPressureBar: '',
        flowRateMlPerSecond: '',
        basketId: '',
        usesPuckScreen: null,
        paperFilterPosition: '',
        distributionMethod: '',
        tampForceKg: '',
        accessoryGearIds: [],
        rating: 0,
        notes: '',
      }
}

function RecipeDetailPage() {
  const { recipe, beans, methods, gear } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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

  if (!recipe) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold">Recipe not found</h1>
        <Button asChild className="mt-4">
          <Link to="/recipes">Back to recipes</Link>
        </Button>
      </div>
    )
  }

  const selectedMethod = methods.find(
    (method) => String(method.id) === values.brewingMethodId,
  )
  const methodOptions = methods.map((method) => ({
    value: String(method.id),
    label: method.name,
  }))
  const beanOptions =
    recipe.bean && !beans.some((bean) => bean.id === recipe.bean?.id)
      ? [recipe.bean, ...beans]
      : beans
  const gearOptions = availableGearForShot(values, gear)
  const set = <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const cancelEdit = () => {
    setName(recipe.name)
    setValues(createFormValues(recipe))
    setFieldErrors({})
    setIsEditing(false)
  }

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = {
      id: recipe.id,
      name,
      ...shotParameterPayload(values),
    }
    const errors = getShotUpdateErrors(data)
    setFieldErrors(errors)
    if (!name.trim() || Object.keys(errors).length > 0) return

    setIsSaving(true)
    try {
      await updateRecipe({ data })
      setIsEditing(false)
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
      toast.success('Recipe updated')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update recipe',
      )
    } finally {
      setIsSaving(false)
    }
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
                onClick={cancelEdit}
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
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                <Pencil /> Edit
              </Button>
              <DeleteConfirmation
                title="Delete this recipe?"
                description="This recipe will be removed permanently. Existing shots are not affected."
                onConfirm={async () => {
                  await deleteRecipe({ data: recipe.id })
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
        <form id="recipe-edit-form" onSubmit={handleSave} className="space-y-6">
          <FormSection
            title="Brewing method"
            description="Choose the method first. It controls which recipe fields are available."
          >
            <SelectField
              id="recipe-method"
              label="Method"
              placeholder="Choose a brewing method"
              value={values.brewingMethodId}
              options={methodOptions}
              onChange={(value) => set('brewingMethodId', value)}
              required
              error={fieldErrors.brewingMethodId}
            />
          </FormSection>
          {selectedMethod ? (
            <>
              <FormSection title="Recipe">
                <InputField
                  id="recipe-name"
                  label="Name"
                  value={name}
                  onChange={setName}
                  required
                  autoFocus
                />
              </FormSection>
              <FormSection title="Beans">
                <BeanPicker
                  id="recipe-bean"
                  label="Beans"
                  value={values.beanId}
                  onChange={(value) => set('beanId', value)}
                  beans={beanOptions}
                />
              </FormSection>
              <ShotParameterFields
                values={values}
                gear={gearOptions}
                enabledParameters={selectedMethod.enabledParameters}
                errors={fieldErrors}
                onChange={set}
              />
            </>
          ) : null}
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
    <div className="space-y-6">
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
