import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EntityImageGallery } from '@/components/entity-image-gallery'
import { GearDetailHeader } from '@/components/gear/gear-detail-header'
import { GearEditForm } from '@/components/gear/gear-edit-form'
import {
  gearFormValuesFrom,
  gearUpdatePayload,
} from '@/components/gear/gear-form-values'
import { GearReadOnlyContent } from '@/components/gear/gear-read-only-content'
import { MachineSettingsDiffModal } from '@/components/gear/machine-settings-diff-modal'
import { Page } from '@/components/page-layout'
import type { ShotsTableServerPagination } from '@/components/ShotsTable'
import { Button } from '@/components/ui/button'
import type { ExtractedMachineSettings } from '@/lib/ai'
import { getErrorMessage } from '@/lib/error-message'
import {
  deleteGear,
  type getGearById,
  researchMachineSettings,
  updateGear,
} from '@/lib/server/gear'
import type { getGearShotPage } from '@/lib/server/shots'

type Gear = Awaited<ReturnType<typeof getGearById>>
type Shots = Awaited<ReturnType<typeof getGearShotPage>>['items']

export function GearDetailPage({
  gear,
  shots,
  shotsPagination,
  researchEnabled,
  isEditing,
  onFinishEditing,
}: {
  gear: Gear
  shots: Shots
  shotsPagination: ShotsTableServerPagination
  researchEnabled: boolean
  isEditing: boolean
  onFinishEditing: () => void | Promise<void>
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [researchModalOpen, setResearchModalOpen] = useState(false)
  const [researchedSettings, setResearchedSettings] =
    useState<ExtractedMachineSettings | null>(null)
  const [formData, setFormData] = useState(() => gearFormValuesFrom(gear))

  if (!gear) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold">Gear not found</h2>
        <Button asChild className="mt-4">
          <Link to="/gear">Back to gear</Link>
        </Button>
      </div>
    )
  }

  const invalidateDetail = () => router.invalidate()
  const resetForm = () => setFormData(gearFormValuesFrom(gear))

  const handleResearch = async () => {
    const name = formData.name.trim()
    const brand = formData.brand.trim()
    const model = formData.model.trim()
    if (!name || !brand || !model) {
      toast.error('Enter the machine name, brand, and model first')
      return
    }

    setIsResearching(true)
    try {
      const result = await researchMachineSettings({
        data: { name, brand, model },
      })
      if (Object.keys(result).length === 0) {
        toast.error('No documented machine settings found')
        return
      }
      setResearchedSettings(result)
      setResearchModalOpen(true)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Research failed'))
    } finally {
      setIsResearching(false)
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.type) return
    setIsSaving(true)
    try {
      await updateGear({ data: gearUpdatePayload(gear.id, formData) })
      await onFinishEditing()
      await invalidateDetail()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this gear'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleArchive = async () => {
    try {
      await updateGear({
        data: { id: gear.id, isArchived: !gear.isArchived },
      })
      await invalidateDetail()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this gear'))
    }
  }

  return (
    <Page width="form">
      <GearDetailHeader
        gear={gear}
        formData={formData}
        isEditing={isEditing}
        isSaving={isSaving}
        onToggleArchive={handleToggleArchive}
        onCancel={() => {
          resetForm()
          void onFinishEditing()
        }}
        onDelete={async () => {
          await deleteGear({ data: gear.id })
          await router.invalidate()
          await navigate({ to: '/gear' })
        }}
      />
      {isEditing ? (
        <>
          <EntityImageGallery
            entityType="gear"
            entityId={gear.id}
            images={gear.images}
            onImagesChange={invalidateDetail}
            editable
          />
          <GearEditForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSave}
            researchEnabled={researchEnabled}
            isResearching={isResearching}
            onResearch={handleResearch}
          />
        </>
      ) : (
        <>
          {gear.images.length > 0 && (
            <EntityImageGallery
              entityType="gear"
              entityId={gear.id}
              images={gear.images}
              onImagesChange={invalidateDetail}
            />
          )}
          <GearReadOnlyContent
            gear={gear}
            shots={shots}
            shotsPagination={shotsPagination}
          />
        </>
      )}
      {researchedSettings ? (
        <MachineSettingsDiffModal
          open={researchModalOpen}
          onOpenChange={setResearchModalOpen}
          currentData={formData}
          suggestedData={researchedSettings}
          onApply={(updates) => {
            setFormData((current) => ({ ...current, ...updates }))
            toast.success(`Applied ${Object.keys(updates).length} changes`)
          }}
        />
      ) : null}
    </Page>
  )
}
