import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Pencil,
  Trash2,
} from 'lucide-react'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import type { GearFormValues } from '@/components/gear/gear-form-values'
import { PageHeader } from '@/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GEAR_TYPE_LABELS } from '@/lib/constants'
import type { getGearById } from '@/lib/server/gear'

type Gear = NonNullable<Awaited<ReturnType<typeof getGearById>>>

export function GearDetailHeader({
  gear,
  formData,
  isEditing,
  isSaving,
  onToggleArchive,
  onCancel,
  onDelete,
}: {
  gear: Gear
  formData: GearFormValues
  isEditing: boolean
  isSaving: boolean
  onToggleArchive: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <PageHeader
      size="compact"
      title={gear.name}
      description={
        <Badge variant="outline">{GEAR_TYPE_LABELS[gear.type]}</Badge>
      }
      leading={
        <Button variant="outline" size="icon" asChild>
          <Link to="/gear" aria-label="Back to gear">
            <ArrowLeft />
          </Link>
        </Button>
      }
      actions={
        <>
          {gear.isArchived && <Badge variant="secondary">Archived</Badge>}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onToggleArchive}
          >
            {gear.isArchived ? (
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
              <Button
                variant="outline"
                type="button"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="gear-edit-form"
                disabled={
                  isSaving ||
                  !formData.brand.trim() ||
                  !formData.model.trim() ||
                  !formData.type
                }
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/gear/$gearId"
                  params={{ gearId: String(gear.id) }}
                  search={(current) => ({ ...current, edit: true })}
                >
                  <Pencil />
                  Edit
                </Link>
              </Button>
              <DeleteConfirmation
                title="Delete this gear?"
                description="This will remove it from your brew records. This action cannot be undone."
                onConfirm={onDelete}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
                    aria-label="Delete gear"
                  >
                    <Trash2 />
                  </Button>
                }
              />
            </>
          )}
        </>
      }
    />
  )
}
