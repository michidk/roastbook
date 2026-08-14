import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Pencil } from 'lucide-react'
import { type SyntheticEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { InputField } from '@/components/form/form-field'
import { Page, PageHeader } from '@/components/page-layout'
import {
  type ShotEditData,
  ShotEditForm,
} from '@/components/shots/shot-edit-form'
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
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { saveShotAsRecipe } from '@/lib/server/recipes'
import { deleteShot, getShot } from '@/lib/server/shots'
import { getTasteTags } from '@/lib/server/taste-tags'

export const Route = createFileRoute('/shots/$shotId')({
  loader: async ({ params }) => {
    const shotId = Number(params.shotId)
    const shot = await getShot({ data: shotId })
    return { shot }
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
  const { shot } = Route.useLoaderData()
  const formatNumber = useNumberFormatter()
  const navigate = useNavigate()
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)
  const [editData, setEditData] = useState<ShotEditData | null>(null)
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)

  const handleStartEdit = async () => {
    if (!editData) {
      setIsLoadingEditData(true)
      try {
        const [beans, tasteTags, gear, methods] = await Promise.all([
          getActiveBeans(),
          getTasteTags(),
          getGear(),
          getBrewingMethods(),
        ])
        setEditData({ beans, tasteTags, gear, methods })
      } finally {
        setIsLoadingEditData(false)
      }
    }
    setIsEditing(true)
  }

  if (!shot) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Shot not found</h2>
        <Button asChild className="mt-4">
          <Link to="/shots">Back to shots</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteShot({ data: shot.id })
      navigate({ to: '/shots' })
    } catch {
      toast.error('Failed to delete shot')
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaved = async () => {
    await router.invalidate({ filter: (match) => match.routeId === Route.id })
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaveRecipe = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = recipeName.trim()
    if (!name) return
    setIsSavingRecipe(true)
    try {
      const recipe = await saveShotAsRecipe({ data: { shotId: shot.id, name } })
      if (!recipe) {
        toast.error('Could not save this recipe')
        return
      }
      setRecipeName('')
      setIsRecipeDialogOpen(false)
      toast.success('Recipe saved')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this recipe',
      )
    } finally {
      setIsSavingRecipe(false)
    }
  }

  const ratio =
    shot.doseGrams && shot.yieldGrams
      ? (Number(shot.yieldGrams) / Number(shot.doseGrams)).toFixed(1)
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
          value: `${formatNumber(shot.brewTemperatureCelsius)}°C`,
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
  const hasTasting = Boolean(shot.rating || hasTasteTags || hasNotes)

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={shot.bean?.name || 'Unknown beans'}
        description={
          <time dateTime={new Date(shot.createdAt).toISOString()}>
            {shot.brewingMethod.name} · {formatDateTime(shot.createdAt)}
          </time>
        }
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/shots" aria-label="Back to shots">
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
                    Save as recipe
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save as recipe</DialogTitle>
                      <DialogDescription>
                        Save this shot’s brewing method, equipment, and recipe
                        values for reuse.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={handleSaveRecipe}
                      className="grid min-h-0 grid-rows-[1fr_auto]"
                    >
                      <DialogBody>
                        <InputField
                          id="recipe-name"
                          label="Recipe name"
                          value={recipeName}
                          onChange={setRecipeName}
                          autoFocus
                          required
                        />
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
                          disabled={!recipeName.trim() || isSavingRecipe}
                          aria-busy={isSavingRecipe}
                        >
                          {isSavingRecipe ? 'Saving…' : 'Save recipe'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  ref={editButtonRef}
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  disabled={isLoadingEditData}
                >
                  <Pencil />
                  Edit
                </Button>
              </>
            )}
            <DeleteConfirmation
              title="Delete this shot?"
              description="This action cannot be undone."
              onConfirm={handleDelete}
            />
          </>
        }
      />

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
                {hasTasteTags && (
                  <div className="flex flex-wrap gap-2">
                    {shot.tasteTags.map((tt) => (
                      <Badge
                        key={tt.id}
                        variant={
                          tt.tasteTag.category === 'negative'
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
