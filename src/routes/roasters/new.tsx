import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputField, TextareaField } from "@/components/FormField"
import { createRoaster } from "@/lib/server/roasters"
import { toast } from "sonner"

export const Route = createFileRoute("/roasters/new")({
  component: NewRoasterPage,
})

function NewRoasterPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    country: "",
    website: "",
    instagramHandle: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    try {
      const roaster = await createRoaster({
        data: {
          name: formData.name.trim(),
          location: formData.location.trim() || undefined,
          country: formData.country.trim() || undefined,
          website: formData.website.trim() || undefined,
          instagramHandle: formData.instagramHandle.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        },
      })
      navigate({ to: "/roasters/$roasterId", params: { roasterId: String(roaster.id) } })
    } catch {
      toast.error("Failed to create roaster")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/roasters">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Add Roaster</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link to="/roasters">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
            {isSubmitting ? "Creating..." : "Create Roaster"}
          </Button>
        </div>
      </form>
    </div>
  )
}
