import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  type BeanFormData,
  BeanInfoDiffModal,
} from '@/components/BeanInfoDiffModal'
import {
  BeanDetailHeader,
  BeanEditContent,
  BeanReadOnlyContent,
} from '@/components/beans/bean-detail-content'
import {
  beanUpdatePayload,
  createEmptyBeanFormValues,
  toBeanFormValues,
} from '@/components/beans/bean-form-values'
import type { EntityImage } from '@/components/entity-image-gallery'
import { Page } from '@/components/page-layout'
import {
  ExtractedRoasterDialog,
  roasterDetailsFromExtraction,
} from '@/components/roasters/extracted-roaster-dialog'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { ShotsTable } from '@/components/ShotsTable'
import { ShotParameterCharts } from '@/components/shot-parameter-charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExtractedBeanInfo } from '@/lib/ai'
import { estimateRemainingBeanWeight } from '@/lib/bean-weight'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { getErrorMessage } from '@/lib/error-message'
import { imageUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import {
  checkResearchEnabled,
  checkVisionEnabled,
  deleteBean,
  extractBeanInfo,
  getBean,
  researchBeanInfo,
  updateBean,
} from '@/lib/server/beans'
import { getRoasters } from '@/lib/server/roasters'
import { getBeanShotAnalytics, getBeanShotPage } from '@/lib/server/shots'

const parseBeanDetailSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    ...parseEditModeSearch(search),
    shotPage: searchInteger(search.shotPage, 1, 1, 100_000) ?? 1,
    shotSort: searchEnum(
      search.shotSort,
      ['date', 'bean', 'dose', 'yield', 'time', 'rating'],
      'date',
    ),
    shotDirection: searchEnum(search.shotDirection, ['asc', 'desc'], 'desc'),
  }
}

export const Route = createFileRoute('/beans/$beanId')({
  validateSearch: searchValidator(parseBeanDetailSearch),
  loaderDeps: ({ search }) => ({
    shotPage: search.shotPage,
    shotSort: search.shotSort,
    shotDirection: search.shotDirection,
  }),
  loader: async ({ params, deps }) => {
    const beanId = Number(params.beanId)
    const [
      bean,
      shotPage,
      shotAnalytics,
      roasters,
      visionEnabled,
      researchEnabled,
    ] = await Promise.all([
      getBean({ data: beanId }),
      getBeanShotPage({
        data: {
          entityId: beanId,
          page: deps.shotPage,
          query: '',
          sort: deps.shotSort,
          direction: deps.shotDirection,
        },
      }),
      getBeanShotAnalytics({ data: beanId }),
      getRoasters(),
      checkVisionEnabled(),
      checkResearchEnabled(),
    ])
    return {
      bean,
      shotPage,
      shotAnalytics,
      roasters,
      visionEnabled: visionEnabled.enabled,
      researchEnabled: researchEnabled.enabled,
    }
  },
  component: BeanDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/beans" backLabel="Back to beans" />
  ),
})

function BeanDetailPage() {
  const {
    bean,
    shotPage,
    shotAnalytics,
    roasters,
    visionEnabled,
    researchEnabled,
  } = Route.useLoaderData()
  const search = Route.useSearch()
  const isEditing = search.edit ?? false
  const navigate = useNavigate({ from: '/beans/$beanId' })
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [extractingImageId, setExtractingImageId] = useState<number | null>(
    null,
  )
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [suggestedData, setSuggestedData] = useState<ExtractedBeanInfo | null>(
    null,
  )
  const [extractedRoasterName, setExtractedRoasterName] = useState<
    string | null
  >(null)
  const [availableRoasters, setAvailableRoasters] =
    useState<readonly RoasterOption[]>(roasters)
  const [aiSource, setAiSource] = useState<'image' | 'web'>('web')
  const [formData, setFormData] = useState(() =>
    bean ? toBeanFormValues(bean) : createEmptyBeanFormValues(),
  )

  useEffect(() => {
    if (bean) setFormData(toBeanFormValues(bean))
  }, [bean])

  useEffect(() => {
    setAvailableRoasters(roasters)
  }, [roasters])

  const weightStats = estimateRemainingBeanWeight(
    bean?.weight,
    shotAnalytics.usedWeightGrams,
  )

  const updateShotSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  if (!bean) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Bean not found</h2>
        <Button asChild className="mt-4">
          <Link to="/beans">Back to beans</Link>
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setIsSaving(true)
    try {
      await updateBean({
        data: beanUpdatePayload(bean.id, formData),
      })
      await navigate({
        search: (current) => ({ ...current, edit: undefined }),
        replace: true,
      })
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update bean'))
    } finally {
      setIsSaving(false)
    }
  }

  const showSuggestion = (
    result: ExtractedBeanInfo,
    source: 'image' | 'web',
  ) => {
    if (Object.keys(result).length === 0) {
      if (source === 'web') toast.error('No information found')
      return false
    }
    setSuggestedData(result)
    setAiSource(source)
    setDiffModalOpen(true)
    return true
  }

  const handleResearchOnline = async () => {
    if (!formData.name.trim()) return toast.error('Enter a bean name first')
    setIsResearching(true)
    try {
      const roasterName = formData.roasterId
        ? availableRoasters.find(
            (roaster) => String(roaster.id) === formData.roasterId,
          )?.name
        : undefined
      showSuggestion(
        await researchBeanInfo({
          data: { beanName: formData.name, roasterName },
        }),
        'web',
      )
    } catch (error) {
      toast.error(getErrorMessage(error, 'Research failed'))
    } finally {
      setIsResearching(false)
    }
  }

  const handleExtractFromImage = async (image: EntityImage) => {
    setExtractingImageId(image.id)
    try {
      const response = await fetch(imageUrl(image.storagePath))
      if (!response.ok) throw new Error('Could not load that picture')
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Could not read that picture'))
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result)
          else reject(new Error('Could not read that picture'))
        }
        reader.readAsDataURL(blob)
      })
      const encodedImage = dataUrl.split(',', 2)[1]
      if (!encodedImage) throw new Error('Could not read that picture')
      const extracted = await extractBeanInfo({
        data: {
          imageBase64: encodedImage,
          mimeType: blob.type,
        },
      })
      if (!showSuggestion(extracted, 'image')) {
        throw new Error(
          'No coffee details were readable. Try a sharp, well-lit photo of the front or label.',
        )
      }
    } finally {
      setExtractingImageId(null)
    }
  }

  return (
    <Page width="wide">
      <BeanDetailHeader
        bean={bean}
        formData={formData}
        roasters={availableRoasters}
        isEditing={isEditing}
        isSaving={isSaving}
        recommendationEnabled={researchEnabled}
        shotCount={shotAnalytics.totalShots}
        onToggleArchive={() => {
          void updateBean({
            data: { id: bean.id, isArchived: !bean.isArchived },
          })
            .then(() =>
              router.invalidate({
                filter: (match) => match.routeId === Route.id,
              }),
            )
            .catch((error) => {
              toast.error(getErrorMessage(error, 'Could not update this bean'))
            })
        }}
        onCancelEdit={() => {
          setFormData(toBeanFormValues(bean))
          void navigate({
            search: (current) => ({ ...current, edit: undefined }),
            replace: true,
          })
        }}
        onSave={handleSave}
        onDelete={async () => {
          await deleteBean({ data: bean.id })
          await navigate({ to: '/beans' })
        }}
      />
      {isEditing ? (
        <BeanEditContent
          bean={bean}
          formData={formData}
          setFormData={setFormData}
          roasters={availableRoasters}
          researchEnabled={researchEnabled}
          visionEnabled={visionEnabled}
          isResearching={isResearching}
          extractingImageId={extractingImageId}
          onResearch={handleResearchOnline}
          onExtractFromImage={handleExtractFromImage}
          onImagesChange={() =>
            router.invalidate({ filter: (match) => match.routeId === Route.id })
          }
        />
      ) : (
        <BeanReadOnlyContent
          bean={bean}
          shotCount={shotAnalytics.totalShots}
          topTasteTags={shotAnalytics.topTasteTags}
          weightStats={weightStats}
          onImagesChange={() =>
            router.invalidate({ filter: (match) => match.routeId === Route.id })
          }
        />
      )}
      <ShotParameterCharts
        shots={shotAnalytics.chartShots}
        totalShots={shotAnalytics.totalShots}
      />
      <Card>
        <CardHeader>
          <CardTitle>Brew history</CardTitle>
        </CardHeader>
        <CardContent>
          <ShotsTable
            shots={shotPage.items}
            hideBean
            serverPagination={{
              page: shotPage.page,
              totalPages: shotPage.totalPages,
              totalItems: shotPage.totalItems,
              query: '',
              sortKey: search.shotSort,
              sortDirection: search.shotDirection,
              onPageChange: (shotPage) => updateShotSearch({ shotPage }),
              onQueryChange: () => undefined,
              onSort: (shotSort) =>
                updateShotSearch({
                  shotSort,
                  shotDirection:
                    search.shotSort === shotSort
                      ? search.shotDirection === 'asc'
                        ? 'desc'
                        : 'asc'
                      : shotSort === 'date' || shotSort === 'rating'
                        ? 'desc'
                        : 'asc',
                  shotPage: 1,
                }),
            }}
          />
        </CardContent>
      </Card>
      {suggestedData && (
        <BeanInfoDiffModal
          open={diffModalOpen}
          onOpenChange={setDiffModalOpen}
          currentData={formData}
          suggestedData={suggestedData}
          onApply={(updates: Partial<BeanFormData>) => {
            setFormData((current) => ({ ...current, ...updates }))
            const updateCount = Object.keys(updates).length
            if (updateCount > 0) {
              toast.success(`Applied ${updateCount} changes`)
            }
          }}
          onReviewRoaster={setExtractedRoasterName}
          source={aiSource}
        />
      )}
      {extractedRoasterName ? (
        <ExtractedRoasterDialog
          open
          suggestedName={extractedRoasterName}
          suggestedDetails={
            suggestedData
              ? roasterDetailsFromExtraction(suggestedData)
              : undefined
          }
          currentRoasterId={formData.roasterId}
          roasters={availableRoasters}
          onOpenChange={(open) => {
            if (!open) setExtractedRoasterName(null)
          }}
          onSelect={(roaster) => {
            setFormData((current) => ({
              ...current,
              roasterId: String(roaster.id),
            }))
          }}
          onCreated={(roaster) => {
            setAvailableRoasters((current) => [...current, roaster])
            setFormData((current) => ({
              ...current,
              roasterId: String(roaster.id),
            }))
            setExtractedRoasterName(null)
          }}
        />
      ) : null}
    </Page>
  )
}
