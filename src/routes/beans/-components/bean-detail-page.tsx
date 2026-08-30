import { getRouteApi, useNavigate, useRouter } from '@tanstack/react-router'
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
import { ShotParameterCharts } from '@/components/shots/shot-parameter-charts'
import { ShotsTable } from '@/components/shots/shots-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormState } from '@/hooks/use-form-state'
import { estimateRemainingBeanWeight } from '@/lib/bean-weight'
import { nextSortDirection } from '@/lib/collection-sort'
import { getErrorMessage } from '@/lib/error-message'
import { fetchImageAsBase64 } from '@/lib/image-base64'
import { imageUrl } from '@/lib/image-url'
import { getExtractedRoasterAction } from '@/lib/roaster-match'
import {
  deleteBean,
  extractBeanInfo,
  researchBeanInfo,
  updateBean,
} from '@/lib/server/beans'
import type { ExtractedBeanInfo } from '@/modules/ai/read-models'

const routeApi = getRouteApi('/beans/$beanId')

export function BeanDetailPage() {
  const {
    bean,
    shotPage,
    shotAnalytics,
    roasters,
    visionEnabled,
    researchEnabled,
  } = routeApi.useLoaderData()
  const search = routeApi.useSearch()
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
          data: {
            beanName: formData.name,
            roasterName,
            knownContext: {
              type: formData.type || undefined,
              origin: formData.origin,
              region: formData.region,
              farm: formData.farm,
              variety: formData.variety,
              process: formData.process,
              roastLevel: formData.roastLevel || undefined,
              roastDate: formData.roastDate,
              shopUrl: formData.shopUrl,
              notes: formData.notes,
            },
          },
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
              sortKey: search.brewSort,
              sortDirection: search.brewDirection,
              onPageChange: (brewPage) => updateSearch({ brewPage }),
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
          roasterAction={getExtractedRoasterAction(
            availableRoasters,
            suggestedData.roaster,
            formData.roasterId,
          )}
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
