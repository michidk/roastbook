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
import { BeanPurchaseDialog } from '@/components/beans/bean-purchase-dialog'
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
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useFormState } from '@/hooks/use-form-state'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { estimateRemainingBeanWeight } from '@/lib/bean-weight'
import { nextSortDirection } from '@/lib/collection-sort'
import { getErrorMessage } from '@/lib/error-message'
import { fetchImageAsBase64 } from '@/lib/image-base64'
import { imageUrl } from '@/lib/image-url'
import { getExtractedRoasterAction } from '@/lib/roaster-match'
import { setBeanPurchaseArchived } from '@/lib/server/bean-purchases'
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
    offlineSnapshotSavedAt,
  } = routeApi.useLoaderData()
  const search = routeApi.useSearch()
  const isEditing = search.edit ?? false
  const navigate = useNavigate({ from: '/beans/$beanId' })
  const router = useRouter()
  const formatDateTime = useDateTimeFormatter()
  const isOnline = useOnlineStatus()
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
  const [isExtracting, setIsExtracting] = useState(false)
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

  useEffect(() => {
    if (!bean || offlineSnapshotSavedAt) return
    void import('@/modules/offline/entity-detail-cache')
      .then(({ cacheEntityDetail }) =>
        cacheEntityDetail('bean', bean.id, {
          bean,
          shotPage,
          shotAnalytics,
          roasters,
          visionEnabled,
          researchEnabled,
          query: {
            brewPage: search.brewPage,
            brewSort: search.brewSort,
            brewDirection: search.brewDirection,
          },
        }),
      )
      .catch(() => undefined)
  }, [
    bean,
    shotPage,
    shotAnalytics,
    roasters,
    visionEnabled,
    researchEnabled,
    offlineSnapshotSavedAt,
    search.brewPage,
    search.brewSort,
    search.brewDirection,
  ])

  const currentPurchase =
    bean?.purchases.find((purchase) => !purchase.isArchived) ??
    bean?.purchases[0]
  const weightStats = estimateRemainingBeanWeight(
    currentPurchase?.initialWeightGrams ?? null,
    String(
      currentPurchase?.shots.reduce(
        (total, shot) => total + Number(shot.doseGrams ?? 0),
        0,
      ) ?? 0,
    ),
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
    if (!isOnline) {
      toast.error('Research needs a connection')
      return
    }
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
              isDecaf: formData.isDecaf || undefined,
              origin: formData.origin,
              region: formData.region,
              farm: formData.farm,
              variety: formData.variety,
              process: formData.process,
              roastLevel: formData.roastLevel || undefined,
              roastDate: formData.roastDate || undefined,
              shopUrl: formData.shopUrl || undefined,
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

  const handleExtractFromImages = async () => {
    if (bean.images.length === 0) return
    if (!isOnline) {
      toast.error('Image extraction needs a connection')
      return
    }
    setIsExtracting(true)
    try {
      const images = await Promise.all(
        bean.images.slice(0, 6).map(async (image) => {
          const encoded = await fetchImageAsBase64(imageUrl(image.storagePath))
          return { imageBase64: encoded.base64, mimeType: encoded.mimeType }
        }),
      )
      const extracted = await extractBeanInfo({ data: { images } })
      if (!showSuggestion(extracted, 'image')) {
        throw new Error(
          'No coffee details were readable. Try a sharp, well-lit photo of the front or label.',
        )
      }
    } finally {
      setIsExtracting(false)
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
        recommendationEnabled={researchEnabled && isOnline}
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
          const result = await deleteBean({ data: bean.id })
          if (!result.archived) {
            const { removeCachedEntityDetail } = await import(
              '@/modules/offline/entity-detail-cache'
            )
            await removeCachedEntityDetail('bean', bean.id).catch(
              () => undefined,
            )
          }
          await router.invalidate()
          if (result.archived) {
            toast.success(
              'This coffee is in your history, so it was moved to the archive',
            )
          } else {
            await navigate({ to: '/beans' })
          }
        }}
      />
      {offlineSnapshotSavedAt ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Showing a saved copy from {formatDateTime(offlineSnapshotSavedAt)}.
        </p>
      ) : null}
      {!isEditing ? (
        <div className="flex justify-end">
          <BeanPurchaseDialog
            beanId={bean.id}
            beanName={bean.name}
            visionEnabled={visionEnabled}
            previous={bean.purchases[0]}
            onSaved={() => router.invalidate()}
          />
        </div>
      ) : null}
      {isEditing ? (
        <BeanEditContent
          bean={bean}
          formData={formData}
          setFormData={setFormData}
          roasters={availableRoasters}
          researchEnabled={researchEnabled}
          visionEnabled={visionEnabled}
          online={isOnline}
          isResearching={isResearching}
          isExtracting={isExtracting}
          onResearch={handleResearchOnline}
          onExtractFromImages={handleExtractFromImages}
          onImagesChange={() => router.invalidate()}
        />
      ) : (
        <BeanReadOnlyContent
          bean={bean}
          shotCount={shotAnalytics.totalShots}
          topTasteTags={shotAnalytics.topTasteTags}
          weightStats={weightStats}
          onImagesChange={() => router.invalidate()}
          onTogglePurchase={(purchaseId, isArchived) => {
            void setBeanPurchaseArchived({
              data: { id: purchaseId, beanId: bean.id, isArchived },
            })
              .then(() => router.invalidate())
              .catch((error) =>
                toast.error(
                  getErrorMessage(error, 'Could not update this bag'),
                ),
              )
          }}
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
