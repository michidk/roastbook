import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import {
  type BeanFormData,
  BeanInfoDiffModal,
} from '@/components/beans/bean-info-diff-modal'
import type { EntityImage } from '@/components/entity-image-gallery'
import { EntityNotFound } from '@/components/entity-not-found'
import { Page } from '@/components/page-layout'
import {
  ExtractedRoasterDialog,
  roasterDetailsFromExtraction,
} from '@/components/roasters/extracted-roaster-dialog'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { ShotParameterCharts } from '@/components/shots/shot-parameter-charts'
import { ShotsTable } from '@/components/shots/shots-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormState } from '@/hooks/use-form-state'
import type { ExtractedBeanInfo } from '@/lib/ai'
import { estimateRemainingBeanWeight } from '@/lib/bean-weight'
import { nextSortDirection } from '@/lib/collection-sort'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { getErrorMessage } from '@/lib/error-message'
import { fetchImageAsBase64 } from '@/lib/image-base64'
import { imageUrl } from '@/lib/image-url'
import { parseIdParam } from '@/lib/route-params'
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
    brewPage: searchInteger(search.brewPage, 1, 1, 100_000) ?? 1,
    brewSort: searchEnum(
      search.brewSort,
      ['date', 'bean', 'dose', 'yield', 'time', 'rating'],
      'date',
    ),
    brewDirection: searchEnum(search.brewDirection, ['asc', 'desc'], 'desc'),
  }
}

export const Route = createFileRoute('/beans/$beanId')({
  validateSearch: searchValidator(parseBeanDetailSearch),
  search: {
    middlewares: [
      stripSearchParams({
        brewPage: 1,
        brewSort: 'date',
        brewDirection: 'desc',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    brewPage: search.brewPage,
    brewSort: search.brewSort,
    brewDirection: search.brewDirection,
  }),
  loader: async ({ params, deps }) => {
    const beanId = parseIdParam(params.beanId)
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
          page: deps.brewPage,
          query: '',
          sort: deps.brewSort,
          direction: deps.brewDirection,
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
  const updateSearch = (
    values: Partial<typeof search>,
    options?: { replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })
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
  const {
    values: formData,
    patch: patchFormData,
    setValues: setFormData,
  } = useFormState(() =>
    bean ? toBeanFormValues(bean) : createEmptyBeanFormValues(),
  )

  useEffect(() => {
    if (bean) setFormData(toBeanFormValues(bean))
  }, [bean, setFormData])

  useEffect(() => {
    setAvailableRoasters(roasters)
  }, [roasters])

  const weightStats = estimateRemainingBeanWeight(
    bean?.weight,
    shotAnalytics.usedWeightGrams,
  )

  if (!bean) {
    return (
      <EntityNotFound entity="Bean" backTo="/beans" backLabel="Back to beans" />
    )
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setIsSaving(true)
    try {
      await updateBean({
        data: beanUpdatePayload(bean.id, formData),
      })
      await updateSearch({ edit: undefined }, { replace: true })
      await router.invalidate()
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
      const encodedImage = await fetchImageAsBase64(imageUrl(image.storagePath))
      const extracted = await extractBeanInfo({
        data: {
          imageBase64: encodedImage.base64,
          mimeType: encodedImage.mimeType,
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
            .then(() => router.invalidate())
            .catch((error) => {
              toast.error(getErrorMessage(error, 'Could not update this bean'))
            })
        }}
        onCancelEdit={() => {
          setFormData(toBeanFormValues(bean))
          void updateSearch({ edit: undefined }, { replace: true })
        }}
        onSave={handleSave}
        onDelete={async () => {
          await deleteBean({ data: bean.id })
          await router.invalidate()
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
          onImagesChange={() => router.invalidate()}
        />
      ) : (
        <BeanReadOnlyContent
          bean={bean}
          shotCount={shotAnalytics.totalShots}
          topTasteTags={shotAnalytics.topTasteTags}
          weightStats={weightStats}
          onImagesChange={() => router.invalidate()}
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
              sortKey: search.brewSort,
              sortDirection: search.brewDirection,
              onPageChange: (brewPage) => updateSearch({ brewPage }),
              onQueryChange: () => undefined,
              onSort: (brewSort) =>
                updateSearch({
                  brewSort,
                  // New date/rating columns start with the most recent or
                  // best brews first instead of the shared ascending default.
                  brewDirection:
                    search.brewSort !== brewSort &&
                    (brewSort === 'date' || brewSort === 'rating')
                      ? 'desc'
                      : nextSortDirection(
                          search.brewSort,
                          search.brewDirection,
                          brewSort,
                        ),
                  brewPage: 1,
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
            patchFormData(updates)
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
            patchFormData({ roasterId: String(roaster.id) })
          }}
          onCreated={(roaster) => {
            setAvailableRoasters((current) => [...current, roaster])
            patchFormData({ roasterId: String(roaster.id) })
            setExtractedRoasterName(null)
          }}
        />
      ) : null}
    </Page>
  )
}
