import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
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
import { getShotsByBean } from '@/lib/server/shots'

export const Route = createFileRoute('/beans/$beanId')({
  loader: async ({ params }) => {
    const beanId = Number(params.beanId)
    const [bean, shots, roasters, visionEnabled, researchEnabled] =
      await Promise.all([
        getBean({ data: beanId }),
        getShotsByBean({ data: beanId }),
        getRoasters(),
        checkVisionEnabled(),
        checkResearchEnabled(),
      ])
    return {
      bean,
      shots,
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
  const { bean, shots, roasters, visionEnabled, researchEnabled } =
    Route.useLoaderData()
  const navigate = useNavigate()
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

  const weightStats = useMemo(() => {
    if (!bean?.weight) return null
    const initialWeight = Number.parseFloat(bean.weight)
    if (!Number.isFinite(initialWeight) || initialWeight <= 0) return null
    const usedWeight = shots.reduce(
      (sum, shot) =>
        sum + (shot.doseGrams ? Number.parseFloat(shot.doseGrams) : 0),
      0,
    )
    const remainingWeight = Math.max(0, initialWeight - usedWeight)
    return {
      initialWeight,
      usedWeight,
      remainingWeight,
      percentRemaining: Math.round((remainingWeight / initialWeight) * 100),
    }
  }, [bean?.weight, shots])

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
        data: {
          id: bean.id,
          name: formData.name,
          type: formData.type || null,
          roasterId: formData.roasterId ? Number(formData.roasterId) : null,
          weight: formData.weight || null,
          price: formData.price || null,
          priceCurrency: formData.priceCurrency || null,
          shopUrl: formData.shopUrl || null,
          origin: formData.origin,
          region: formData.region,
          farm: formData.farm,
          variety: formData.variety,
          process: formData.process,
          roastLevel: formData.roastLevel || null,
          roastDate: formData.roastDate ? new Date(formData.roastDate) : null,
          notes: formData.notes,
        },
      })
      setIsEditing(false)
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update bean',
      )
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
      toast.error(error instanceof Error ? error.message : 'Research failed')
    } finally {
      setIsResearching(false)
    }
  }

  const handleExtractFromImage = async (image: EntityImage) => {
    setExtractingImageId(image.id)
    try {
      const blob = await fetch(imageUrl(image.storagePath)).then((response) =>
        response.blob(),
      )
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      showSuggestion(
        await extractBeanInfo({
          data: {
            imageBase64: dataUrl.split(',')[1],
            mimeType: blob.type,
          },
        }),
        'image',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Extraction failed')
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
        onToggleArchive={async () => {
          await updateBean({
            data: { id: bean.id, isArchived: !bean.isArchived },
          })
          await router.invalidate({
            filter: (match) => match.routeId === Route.id,
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
          shotCount={shots.length}
          weightStats={weightStats}
          onImagesChange={() =>
            router.invalidate({ filter: (match) => match.routeId === Route.id })
          }
        />
      )}
      <ShotParameterCharts shots={shots} />
      <Card>
        <CardHeader>
          <CardTitle>Shot history</CardTitle>
        </CardHeader>
        <CardContent>
          <ShotsTable shots={shots} hideBean />
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
