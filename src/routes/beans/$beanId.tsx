import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { ShotsTable } from '@/components/ShotsTable'
import { ShotParameterCharts } from '@/components/shot-parameter-charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExtractedBeanInfo } from '@/lib/ai'
import { getErrorMessage } from '@/lib/error-message'
import { imageUrl } from '@/lib/image-url'
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

const beanDetailSearchSchema = z.object({
  shotPage: z.number().int().min(1).max(100_000).default(1).catch(1),
  shotSort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date')
    .catch('date'),
  shotDirection: z.enum(['asc', 'desc']).default('desc').catch('desc'),
})

export const Route = createFileRoute('/beans/$beanId')({
  validateSearch: beanDetailSearchSchema,
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
  const navigate = useNavigate({ from: '/beans/$beanId' })
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [extractingImageId, setExtractingImageId] = useState<number | null>(
    null,
  )
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [suggestedData, setSuggestedData] = useState<ExtractedBeanInfo | null>(
    null,
  )
  const [aiSource, setAiSource] = useState<'image' | 'web'>('web')
  const [formData, setFormData] = useState(() =>
    bean ? toBeanFormValues(bean) : createEmptyBeanFormValues(),
  )

  useEffect(() => {
    if (bean) setFormData(toBeanFormValues(bean))
  }, [bean])

  const weightStats = (() => {
    if (!bean?.weight) return null
    const initialWeight = Number.parseFloat(bean.weight)
    if (!Number.isFinite(initialWeight) || initialWeight <= 0) return null
    const usedWeight = Number.parseFloat(shotAnalytics.usedWeightGrams)
    const remainingWeight = Math.max(0, initialWeight - usedWeight)
    return {
      initialWeight,
      usedWeight,
      remainingWeight,
      percentRemaining: Math.round((remainingWeight / initialWeight) * 100),
    }
  })()

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
      setIsEditing(false)
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
      toast.error(
        source === 'web'
          ? 'No information found'
          : "Couldn't extract any information",
      )
      return
    }
    setSuggestedData(result)
    setAiSource(source)
    setDiffModalOpen(true)
  }

  const handleResearchOnline = async () => {
    if (!formData.name.trim()) return toast.error('Enter a bean name first')
    setIsResearching(true)
    try {
      const roasterName = formData.roasterId
        ? roasters.find((roaster) => String(roaster.id) === formData.roasterId)
            ?.name
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
      showSuggestion(
        await extractBeanInfo({
          data: {
            imageBase64: encodedImage,
            mimeType: blob.type,
          },
        }),
        'image',
      )
    } catch (error) {
      toast.error(getErrorMessage(error, 'Extraction failed'))
    } finally {
      setExtractingImageId(null)
    }
  }

  return (
    <Page width="wide">
      <BeanDetailHeader
        bean={bean}
        formData={formData}
        roasters={roasters}
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
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={() => {
          setFormData(toBeanFormValues(bean))
          setIsEditing(false)
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
          roasters={roasters}
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
            toast.success(`Applied ${Object.keys(updates).length} changes`)
          }}
          source={aiSource}
        />
      )}
    </Page>
  )
}
