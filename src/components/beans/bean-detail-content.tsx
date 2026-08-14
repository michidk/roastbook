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
import type { BeanFormValues } from '@/components/beans/bean-form-values'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import {
  type EntityImage,
  EntityImageGallery,
} from '@/components/entity-image-gallery'
import {
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { PageHeader } from '@/components/page-layout'
import {
  type RoasterOption,
  RoasterPicker,
} from '@/components/roasters/roaster-picker'
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
import {
  BEAN_TYPE_LABELS,
  BEAN_TYPES,
  type BeanType,
  PROCESS_METHODS,
  ROAST_LEVELS,
  type RoastLevel,
} from '@/lib/constants'

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
  onStartEdit,
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
  onStartEdit: () => void
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
              className="font-bold text-link hover:underline"
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
                request={
                  shotCount > 0 ? { source: 'bean', beanId: bean.id } : null
                }
                enabled={recommendationEnabled}
                size="sm"
              />
              <Button variant="outline" size="sm" onClick={onStartEdit}>
                <Pencil />
                Edit
              </Button>
              <Button size="sm" asChild>
                <Link to="/shots/new" search={{ beanId: bean.id }}>
                  <Plus />
                  Log a shot
                </Link>
              </Button>
            </>
          )}
          <DeleteConfirmation
            title="Delete this bean?"
            description="This will also remove it from any shot records. This action cannot be undone."
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
  onExtractFromImage: (image: EntityImage) => void
  onImagesChange: () => void
}) {
  const set = <Key extends keyof BeanFormValues>(
    key: Key,
    value: BeanFormValues[Key],
  ) => setFormData((current) => ({ ...current, [key]: value }))

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <CardTitle>Basic info</CardTitle>
            {researchEnabled && (
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
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="name"
                label="Name"
                placeholder="e.g., Ethiopia Yirgacheffe"
                value={formData.name}
                onChange={(value) => set('name', value)}
                required
              />
              <RoasterPicker
                id="roasterId"
                label="Roaster"
                placeholder="Select roaster"
                value={formData.roasterId}
                onChange={(value) => set('roasterId', value)}
                roasters={roasters}
              />
              <SelectField
                id="type"
                label="Type"
                placeholder="Select type"
                value={formData.type}
                onChange={(value) =>
                  set('type', (value ?? '') as BeanType | '')
                }
                options={BEAN_TYPES}
              />
              <InputField
                id="weight"
                label="Bag Weight (g)"
                type="number"
                min="0"
                step="50"
                placeholder="e.g., 250"
                value={formData.weight}
                onChange={(value) => set('weight', value)}
              />
              <div className="flex gap-2">
                <InputField
                  id="price"
                  label="Price"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 15.00"
                  value={formData.price}
                  onChange={(value) => set('price', value)}
                  className="flex-1"
                />
                <InputField
                  id="priceCurrency"
                  label="Currency"
                  placeholder="EUR"
                  value={formData.priceCurrency}
                  onChange={(value) => set('priceCurrency', value)}
                  className="w-24"
                />
              </div>
              <InputField
                id="shopUrl"
                label="Shop URL"
                type="url"
                placeholder="https://…"
                value={formData.shopUrl}
                onChange={(value) => set('shopUrl', value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Origin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="origin"
                label="Country"
                placeholder="e.g., Ethiopia"
                value={formData.origin}
                onChange={(value) => set('origin', value)}
              />
              <InputField
                id="region"
                label="Region"
                placeholder="e.g., Yirgacheffe"
                value={formData.region}
                onChange={(value) => set('region', value)}
              />
              <InputField
                id="farm"
                label="Farm/Producer"
                placeholder="e.g., Konga Cooperative"
                value={formData.farm}
                onChange={(value) => set('farm', value)}
              />
              <InputField
                id="variety"
                label="Variety"
                placeholder="e.g., Heirloom"
                value={formData.variety}
                onChange={(value) => set('variety', value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <SelectField
                id="process"
                label="Process"
                placeholder="Select process"
                value={formData.process}
                onChange={(value) => set('process', value ?? '')}
                options={PROCESS_METHODS}
              />
              <SelectField
                id="roastLevel"
                label="Roast Level"
                placeholder="Select level"
                value={formData.roastLevel}
                onChange={(value) =>
                  set('roastLevel', (value ?? '') as RoastLevel | '')
                }
                options={ROAST_LEVELS}
              />
              <InputField
                id="roastDate"
                label="Roast Date"
                type="date"
                value={formData.roastDate}
                onChange={(value) => set('roastDate', value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <TextareaField
              id="notes"
              label=""
              placeholder="Tasting notes, brewing tips, or other observations"
              value={formData.notes}
              onChange={(value) => set('notes', value)}
              rows={4}
            />
          </CardContent>
        </Card>
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
                  label: 'Fill from image',
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
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {weightStats && (
          <Card>
            <CardHeader>
              <CardTitle>Remaining weight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={weightStats.percentRemaining}>
                <ProgressLabel>
                  {formatNumber(weightStats.remainingWeight.toFixed(0))} g
                  remaining
                </ProgressLabel>
                <ProgressValue>
                  {(value) =>
                    `${formatNumber(value ?? weightStats.percentRemaining)}% of ${formatNumber(weightStats.initialWeight.toFixed(0))} g`
                  }
                </ProgressValue>
              </Progress>
              <p className="text-sm text-muted-foreground">
                {formatNumber(weightStats.usedWeight.toFixed(1))} g used across{' '}
                {formatNumber(shotCount)} shot{shotCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}
        {topTasteTags.length > 0 && (
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
        )}
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
                    className="font-medium text-link hover:underline"
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
              <p className="font-medium">{bean.process || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roast Level</p>
              <p className="font-medium capitalize">
                {bean.roastLevel?.replace('_', ' ') || '-'}
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
      {bean.images.length > 0 && (
        <EntityImageGallery
          entityType="beans"
          entityId={bean.id}
          images={bean.images}
          onImagesChange={onImagesChange}
        />
      )}
    </div>
  )
}
