import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { InputField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { Page, PageHeader } from '@/components/page-layout'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import { RoasterResearchAction } from '@/components/roasters/roaster-research-action'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WebsiteLogo } from '@/components/website-logo'
import { deleteRoaster, getRoaster, updateRoaster } from '@/lib/server/roasters'

export const Route = createFileRoute('/roasters/$roasterId')({
  loader: ({ params }) => getRoaster({ data: Number(params.roasterId) }),
  component: RoasterDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/roasters" backLabel="Back to roasters" />
  ),
})

function RoasterDetailPage() {
  const roaster = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<RoasterFormValues>(() => ({
    name: roaster?.name ?? '',
    location: roaster?.location ?? '',
    country: roaster?.country ?? '',
    website: roaster?.website ?? '',
    instagramHandle: roaster?.instagramHandle ?? '',
    notes: roaster?.notes ?? '',
  }))

  if (!roaster) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Roaster not found</h2>
        <Button asChild className="mt-4">
          <Link to="/roasters">Back to roasters</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteRoaster({ data: roaster.id })
    navigate({ to: '/roasters' })
  }

  const handleCancelEdit = () => {
    setFormData({
      name: roaster.name ?? '',
      location: roaster.location ?? '',
      country: roaster.country ?? '',
      website: roaster.website ?? '',
      instagramHandle: roaster.instagramHandle ?? '',
      notes: roaster.notes ?? '',
    })
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    setIsSaving(true)
    try {
      await updateRoaster({
        data: {
          id: roaster.id,
          name: formData.name.trim(),
          location: formData.location.trim() || null,
          country: formData.country.trim() || null,
          website: formData.website.trim() || null,
          instagramHandle: formData.instagramHandle.trim() || null,
          notes: formData.notes.trim() || null,
        },
      })
      setIsEditing(false)
      await router.invalidate({ filter: (match) => match.routeId === Route.id })
    } catch {
      toast.error('Failed to update roaster')
    } finally {
      setIsSaving(false)
    }
  }

  const beanCount = roaster.beans?.length ?? 0

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={
          <span className="inline-flex items-center gap-3">
            <WebsiteLogo
              entityType="roasters"
              entityId={roaster.id}
              website={roaster.website}
              updatedAt={roaster.updatedAt}
              className="size-12"
            />
            <span>
              {isEditing ? formData.name || roaster.name : roaster.name}
            </span>
          </span>
        }
        description={
          (isEditing ? formData.location : roaster.location)
            ? [
                isEditing ? formData.location : roaster.location,
                isEditing ? formData.country : roaster.country,
              ]
                .filter(Boolean)
                .join(', ')
            : undefined
        }
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/roasters" aria-label="Back to roasters">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <>
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !formData.name.trim()}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <DeleteConfirmation
              title="Delete this roaster?"
              description="This will remove the roaster from your collection. Beans linked to this roaster will keep their text roaster field."
              onConfirm={handleDelete}
              trigger={
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </>
        }
      />

      {isEditing ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Roaster info</CardTitle>
              <RoasterResearchAction
                currentData={formData}
                disabled={isSaving}
                onApply={(updates) => {
                  setFormData((current) => ({ ...current, ...updates }))
                  toast.success(
                    `Applied ${Object.keys(updates).length} changes`,
                  )
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <InputField
                id="name"
                label="Name"
                placeholder="e.g., Onyx Coffee Lab"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  id="location"
                  label="Location"
                  placeholder="e.g., Rogers, Arkansas"
                  value={formData.location}
                  onChange={(value) =>
                    setFormData({ ...formData, location: value })
                  }
                />
                <InputField
                  id="country"
                  label="Country"
                  placeholder="e.g., United States"
                  value={formData.country}
                  onChange={(value) =>
                    setFormData({ ...formData, country: value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <FormSection title="Links">
            <InputField
              id="website"
              label="Website"
              type="url"
              placeholder="https://…"
              value={formData.website}
              onChange={(value) => setFormData({ ...formData, website: value })}
            />
            <InputField
              id="instagramHandle"
              label="Instagram"
              placeholder="@handle"
              value={formData.instagramHandle}
              onChange={(value) =>
                setFormData({ ...formData, instagramHandle: value })
              }
            />
          </FormSection>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <TextareaField
                id="notes"
                label=""
                placeholder="Any notes about this roaster…"
                value={formData.notes}
                onChange={(value) => setFormData({ ...formData, notes: value })}
                rows={3}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {(roaster.website || roaster.instagramHandle) && (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roaster.website && (
                  <a
                    href={roaster.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-link hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
                {roaster.instagramHandle && (
                  <a
                    href={`https://instagram.com/${roaster.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-link hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />@
                    {roaster.instagramHandle.replace('@', '')}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {roaster.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{roaster.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Beans
                {beanCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {beanCount}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {beanCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No beans from this roaster yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {roaster.beans?.map((bean) => (
                    <Link
                      key={bean.id}
                      to="/beans/$beanId"
                      params={{ beanId: String(bean.id) }}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium">{bean.name}</span>
                      {bean.roastLevel && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {bean.roastLevel.replace('_', ' ')}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Page>
  )
}
