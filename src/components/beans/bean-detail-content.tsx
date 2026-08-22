import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { BeanFields } from '@/components/beans/bean-fields'
import type { BeanFormValues } from '@/components/beans/bean-form-values'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import {
  type EntityImage,
  EntityImageGallery,
} from '@/components/entity-image-gallery'
import { PageHeader } from '@/components/page-layout'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { AiRecommendationDialog } from '@/components/shots/ai-recommendation-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@/components/ui/progress'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import {
  BEAN_TYPE_LABELS,
  type BeanType,
  getProcessMethodLabel,
  getRoastLevelLabel,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

type Bean = {
  id: number
  name: string
  type: BeanType | null
  isArchived: boolean
  roaster: string | null
  roasterRef: { id: number; name: string } | null
  price: string | null
  priceCurrency: string | null
  shopUrl: string | null
  origin: string | null
  region: string | null
  farm: string | null
  variety: string | null
  process: string | null
  roastLevel: string | null
  roastDate: Date | string | null
  notes: string | null
  images: EntityImage[]
}
type WeightStats = {
  initialWeight: number
  usedWeight: number
  remainingWeight: number
  percentRemaining: number
}
type TopTasteTag = {
  id: number
  name: string
  usageCount: number
}

export function BeanDetailHeader({
  bean,
  formData,
  roasters,
  isEditing,
  isSaving,
  recommendationEnabled,
  shotCount,
  onToggleArchive,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  bean: Bean
  formData: BeanFormValues
  roasters: readonly RoasterOption[]
  isEditing: boolean
  isSaving: boolean
  recommendationEnabled: boolean
  shotCount: number
  onToggleArchive: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const selectedRoaster = roasters.find(
    (roaster) => String(roaster.id) === formData.roasterId,
  )

  return (
    <PageHeader
      size="compact"
      title={isEditing ? formData.name || bean.name : bean.name}
      leading={
        <Button variant="outline" size="icon" asChild>
          <Link to="/beans" aria-label="Back to beans">
            <ArrowLeft />
          </Link>
        </Button>
      }
      description={
        isEditing && selectedRoaster ? (
          <>
            by{' '}
            <span className="font-bold text-link">{selectedRoaster.name}</span>
          </>
        ) : bean.roasterRef ? (
          <>
            by{' '}
            <Link
              to="/roasters/$roasterId"
              params={{ roasterId: String(bean.roasterRef.id) }}
              className="inline-flex min-h-11 items-center rounded-md font-bold text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
            >
              {bean.roasterRef.name}
            </Link>
          </>
        ) : bean.roaster ? (
          <>
            by <span className="font-bold text-link">{bean.roaster}</span>
          </>
        ) : undefined
      }
      actions={
        <>
          {bean.isArchived && <Badge variant="secondary">Archived</Badge>}
          <Button variant="outline" size="sm" onClick={onToggleArchive}>
            {bean.isArchived ? (
              <>
                <ArchiveRestore />
                Unarchive
              </>
            ) : (
              <>
                <Archive />
                Archive
              </>
            )}
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving || !formData.name.trim()}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <AiRecommendationDialog
                enabled={recommendationEnabled}
                request={shotCount > 0 ? { beanId: bean.id } : null}
                size="sm"
              />
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/beans/$beanId"
                  params={{ beanId: String(bean.id) }}
                  search={(current) => ({ ...current, edit: true })}
                >
                  <Pencil />
                  Edit
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/brews/new" search={{ beanId: bean.id }}>
                  <Plus />
                  Log a brew
                </Link>
              </Button>
            </>
          )}
          <DeleteConfirmation
            title="Delete this bean?"
            description="This will also remove it from any brew records. This action cannot be undone."
            onConfirm={onDelete}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete bean">
                <Trash2 />
              </Button>
            }
          />
        </>
      }
    />
  )
}

export function BeanEditContent({
  bean,
  formData,
  setFormData,
  roasters,
  researchEnabled,
  visionEnabled,
  isResearching,
  extractingImageId,
  onResearch,
  onExtractFromImage,
  onImagesChange,
}: {
  bean: Bean
  formData: BeanFormValues
  setFormData: Dispatch<SetStateAction<BeanFormValues>>
  roasters: readonly RoasterOption[]
  researchEnabled: boolean
  visionEnabled: boolean
  isResearching: boolean
  extractingImageId: number | null
  onResearch: () => void
  onExtractFromImage: (image: EntityImage) => Promise<void>
  onImagesChange: () => void
}) {
  const set = <Key extends keyof BeanFormValues>(
    key: Key,
    value: BeanFormValues[Key],
  ) => setFormData((current) => ({ ...current, [key]: value }))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <BeanFields
          values={formData}
          onChange={set}
          roasters={roasters}
          idPrefix="bean-edit"
          basicAction={
            researchEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onResearch}
                disabled={
                  isResearching ||
                  extractingImageId !== null ||
                  !formData.name.trim()
                }
                aria-busy={isResearching}
                className="h-11 sm:h-11 [@media(hover:hover)]:h-8"
              >
                {isResearching ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
                {isResearching ? 'Researching…' : 'Research online'}
              </Button>
            ) : undefined
          }
        />
      </div>
      <div className="space-y-6">
        <EntityImageGallery
          entityType="beans"
          entityId={bean.id}
          images={bean.images}
          onImagesChange={onImagesChange}
          editable
          imageAction={
            visionEnabled
              ? {
                  label: 'Extract details with AI',
                  pendingImageId: extractingImageId,
                  disabled: isResearching,
                  onSelect: onExtractFromImage,
                }
              : undefined
          }
        />
      </div>
    </div>
  )
}

export function BeanReadOnlyContent({
  bean,
  shotCount,
  topTasteTags,
  weightStats,
  onImagesChange,
}: {
  bean: Bean
  shotCount: number
  topTasteTags: readonly TopTasteTag[]
  weightStats: WeightStats | null
  onImagesChange: () => void
}) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const showFlavorTags = useTasteProfile().flavorTags
  const showTasteProfile = showFlavorTags && topTasteTags.length > 0
  const showSidebar =
    weightStats !== null || showTasteProfile || bean.images.length > 0
  return (
    <div
      className={cn(
        'grid gap-6',
        showSidebar && 'lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start',
      )}
    >
      <div className="space-y-6">
        {(bean.price || bean.shopUrl) && (
          <Card>
            <CardHeader>
              <CardTitle>Purchase info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {bean.price && (
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">
                    {formatNumber(bean.price)} {bean.priceCurrency || 'EUR'}
                  </p>
                </div>
              )}
              {bean.shopUrl && (
                <div>
                  <p className="text-sm text-muted-foreground">Shop</p>
                  <a
                    href={bean.shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-md font-medium text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
                  >
                    Visit shop →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Origin</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              ['Country', bean.origin],
              ['Region', bean.region],
              ['Farm/Producer', bean.farm],
              ['Variety', bean.variety],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value || '-'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Processing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">
                {bean.type ? BEAN_TYPE_LABELS[bean.type] : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Process</p>
              <p className="font-medium">
                {bean.process ? getProcessMethodLabel(bean.process) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roast Level</p>
              <p className="font-medium capitalize">
                {bean.roastLevel ? getRoastLevelLabel(bean.roastLevel) : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roast Date</p>
              <p className="font-medium">
                {bean.roastDate ? formatDate(bean.roastDate) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
        {bean.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{bean.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
      {showSidebar ? (
        <aside className="order-first space-y-6 lg:order-last">
          {weightStats ? (
            <Card>
              <CardHeader>
                <CardTitle>Estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={weightStats.percentRemaining}>
                  <ProgressLabel>
                    {formatNumber(weightStats.remainingWeight.toFixed(0))} g
                    remaining
                  </ProgressLabel>
                  <ProgressValue>
                    {() =>
                      `${formatNumber(weightStats.percentRemaining)}% of ${formatNumber(weightStats.initialWeight.toFixed(0))} g`
                    }
                  </ProgressValue>
                </Progress>
                <p className="text-sm text-muted-foreground">
                  {formatNumber(weightStats.usedWeight.toFixed(1))} g used
                  across {formatNumber(shotCount)} brew
                  {shotCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ) : null}
          {showTasteProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>Taste profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Most used taste tags across all shots
                </p>
                <ul className="flex flex-wrap gap-2">
                  {topTasteTags.map((tag) => (
                    <li key={tag.id}>
                      <Badge variant="secondary" className="gap-1.5">
                        {tag.name}
                        <span className="font-normal text-muted-foreground">
                          {formatNumber(tag.usageCount)}
                        </span>
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {bean.images.length > 0 ? (
            <EntityImageGallery
              entityType="beans"
              entityId={bean.id}
              images={bean.images}
              onImagesChange={onImagesChange}
            />
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}
