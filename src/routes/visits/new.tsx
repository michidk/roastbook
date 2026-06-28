import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { InputField, TextareaField } from "@/components/FormField"
import { getActiveBeans } from "@/lib/server/beans"
import { getPlaces } from "@/lib/server/places"
import { getTasteTags } from "@/lib/server/taste-tags"
import { createCafeVisit } from "@/lib/server/cafe-visits"
import { cn } from "@/lib/utils"
import { DRINK_TYPES } from "@/lib/constants"

export const Route = createFileRoute("/visits/new")({
  validateSearch: (search: Record<string, unknown>) => {
    let placeId: string | undefined
    if (typeof search.placeId === "string") {
      placeId = search.placeId.replace(/^"|"$/g, "")
    } else if (typeof search.placeId === "number") {
      placeId = String(search.placeId)
    }
    return { placeId: placeId || undefined }
  },
  loader: async () => {
    const [places, tasteTags, beans] = await Promise.all([getPlaces(), getTasteTags(), getActiveBeans()])
    return { places, tasteTags, beans }
  },
  component: NewVisitPage,
})

function NewVisitPage() {
  const { places, tasteTags, beans } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const initialPlaceId =
    search.placeId && places.some((place) => String(place.id) === search.placeId)
      ? search.placeId
      : ""

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const [formData, setFormData] = useState({
    placeId: initialPlaceId,
    beanId: "",
    drinkName: "",
    drinkType: "",
    price: "",
    currency: "EUR",
    rating: 3,
    notes: "",
  })

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createCafeVisit({
        data: {
          placeId: formData.placeId ? Number(formData.placeId) : undefined,
          beanId: formData.beanId ? Number(formData.beanId) : undefined,
          drinkName: formData.drinkName || undefined,
          drinkType: formData.drinkType || undefined,
          price: formData.price || undefined,
          currency: formData.currency || undefined,
          rating: formData.rating,
          notes: formData.notes || undefined,
          tasteTagIds: selectedTags.length > 0 ? selectedTags : undefined,
        },
      })
      navigate({ to: "/visits" })
    } catch {
      toast.error("Could not save this visit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const negativeTags = tasteTags.filter((t) => t.category === "negative")
  const positiveTags = tasteTags.filter((t) => t.category === "positive")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Visit</h1>
        <p className="text-muted-foreground">
          Record your cafe experience
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="place">Cafe</Label>
              <Select
                value={formData.placeId || undefined}
                onValueChange={(v) => setFormData({ ...formData, placeId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a place" />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={String(place.id)}>
                      {place.name}
                      {place.city && ` (${place.city})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bean">Beans</Label>
              <Select
                value={formData.beanId || undefined}
                onValueChange={(v) => setFormData({ ...formData, beanId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select beans" />
                </SelectTrigger>
                <SelectContent>
                  {beans.map((bean) => (
                    <SelectItem key={bean.id} value={String(bean.id)}>
                      {bean.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drink</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="drinkName"
                label="Drink Name"
                placeholder="e.g., House Blend Latte"
                value={formData.drinkName}
                onChange={(value) => setFormData({ ...formData, drinkName: value })}
              />

              <div className="space-y-2">
                <Label htmlFor="drinkType">Type</Label>
                <Select
                  value={formData.drinkType || undefined}
                  onValueChange={(v) => setFormData({ ...formData, drinkType: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRINK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <InputField
                id="price"
                label="Price"
                placeholder="4.50"
                value={formData.price}
                onChange={(value) => setFormData({ ...formData, price: value })}
              />

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v ?? "EUR" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRating
                value={formData.rating}
                onChange={(rating) => setFormData({ ...formData, rating })}
              />
            </div>

            {negativeTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-destructive">Issues</Label>
                <div className="flex flex-wrap gap-2">
                  {negativeTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "destructive" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedTags.includes(tag.id)
                          ? ""
                          : "hover:bg-destructive/10"
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {positiveTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-primary">Positives</Label>
                <div className="flex flex-wrap gap-2">
                  {positiveTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedTags.includes(tag.id)
                          ? ""
                          : "hover:bg-primary/10"
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <TextareaField
              id="notes"
              label="Notes"
              placeholder="How was your experience?"
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/visits" })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Saving..." : "Save Visit"}
          </Button>
        </div>
      </form>
    </div>
  )
}
