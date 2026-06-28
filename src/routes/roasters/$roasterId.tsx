import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowLeft, Trash2, Pencil, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InputField, TextareaField } from "@/components/FormField"
import { getRoaster, deleteRoaster, updateRoaster } from "@/lib/server/roasters"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { toast } from "sonner"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"

export const Route = createFileRoute("/roasters/$roasterId")({
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
  const [formData, setFormData] = useState(() => ({
    name: roaster?.name ?? "",
    location: roaster?.location ?? "",
    country: roaster?.country ?? "",
    website: roaster?.website ?? "",
    instagramHandle: roaster?.instagramHandle ?? "",
    notes: roaster?.notes ?? "",
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
    navigate({ to: "/roasters" })
  }

  const handleCancelEdit = () => {
    setFormData({
      name: roaster.name ?? "",
      location: roaster.location ?? "",
      country: roaster.country ?? "",
      website: roaster.website ?? "",
      instagramHandle: roaster.instagramHandle ?? "",
      notes: roaster.notes ?? "",
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
      await router.invalidate()
    } catch {
      toast.error("Failed to update roaster")
    } finally {
      setIsSaving(false)
    }
  }

  const beanCount = roaster.beans?.length ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/roasters">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isEditing ? formData.name || roaster.name : roaster.name}
          </h1>
          {(isEditing ? formData.location : roaster.location) && (
            <p className="text-muted-foreground">
              {isEditing ? formData.location : roaster.location}
              {(isEditing ? formData.country : roaster.country) && `, ${isEditing ? formData.country : roaster.country}`}
            </p>
          )}
        </div>
        {isEditing ? (
          <>
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
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
      </div>

      {isEditing ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Roaster Info</CardTitle>
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
                  onChange={(value) => setFormData({ ...formData, location: value })}
                />
                <InputField
                  id="country"
                  label="Country"
                  placeholder="e.g., United States"
                  value={formData.country}
                  onChange={(value) => setFormData({ ...formData, country: value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputField
                id="website"
                label="Website"
                type="url"
                placeholder="https://..."
                value={formData.website}
                onChange={(value) => setFormData({ ...formData, website: value })}
              />
              <InputField
                id="instagramHandle"
                label="Instagram"
                placeholder="@handle"
                value={formData.instagramHandle}
                onChange={(value) => setFormData({ ...formData, instagramHandle: value })}
              />
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
                placeholder="Any notes about this roaster..."
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
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
                {roaster.instagramHandle && (
                  <a
                    href={`https://instagram.com/${roaster.instagramHandle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    @{roaster.instagramHandle.replace("@", "")}
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
                <p className="text-sm text-muted-foreground">No beans from this roaster yet.</p>
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
                          {bean.roastLevel.replace("_", " ")}
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
    </div>
  )
}
