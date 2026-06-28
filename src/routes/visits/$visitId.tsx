import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { ArrowLeft, ExternalLink, MapPin, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "@/components/ui/star-rating"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getCafeVisit,
  deleteCafeVisit,
  updateCafeVisit as updateVisit,
} from "@/lib/server/cafe-visits"
import { getActiveBeans } from "@/lib/server/beans"
import { getPlaces } from "@/lib/server/places"
import { getTasteTags } from "@/lib/server/taste-tags"
import { cn } from "@/lib/utils"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import { DRINK_TYPES } from "@/lib/constants"

export const Route = createFileRoute("/visits/$visitId")({
  loader: async ({ params }) => {
    const visitId = Number(params.visitId)
    const [visit, places, tasteTags, beans] = await Promise.all([
      getCafeVisit({ data: visitId }),
      getPlaces(),
      getTasteTags(),
      getActiveBeans(),
    ])

    return { visit, places, tasteTags, beans }
  },
  component: VisitDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/visits" backLabel="Back to visits" />
  ),
})

type Visit = NonNullable<Awaited<ReturnType<typeof getCafeVisit>>>

function getInitialFormData(visit: Visit | undefined) {
  return {
    placeId: visit?.placeId ? String(visit.placeId) : "",
    beanId: visit?.beanId ? String(visit.beanId) : "",
    drinkName: visit?.drinkName ?? "",
    drinkType: visit?.drinkType ?? "",
    price: visit?.price ?? "",
    currency: visit?.currency ?? "EUR",
    rating: visit?.rating ?? 3,
    notes: visit?.notes ?? "",
  }
}

function getInitialSelectedTags(visit: Visit | undefined) {
  return visit?.tasteTags.map((tagLink) => tagLink.tasteTagId) ?? []
}

function VisitDetailPage() {
  const { visit, places, tasteTags, beans } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>(getInitialSelectedTags(visit))
  const [formData, setFormData] = useState(() => getInitialFormData(visit))

  useEffect(() => {
    setFormData(getInitialFormData(visit))
    setSelectedTags(getInitialSelectedTags(visit))
  }, [visit])

  if (!visit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Visit not found</h2>
        <Button asChild className="mt-4">
          <Link to="/visits">Back to visits</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteCafeVisit({ data: visit.id })
    navigate({ to: "/visits" })
  }

  const handleCancel = () => {
    setFormData(getInitialFormData(visit))
    setSelectedTags(getInitialSelectedTags(visit))
    setIsEditing(false)
  }

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await updateVisit({
        data: {
          id: visit.id,
          placeId: formData.placeId ? Number(formData.placeId) : null,
          beanId: formData.beanId ? Number(formData.beanId) : null,
          drinkName: formData.drinkName || undefined,
          drinkType: formData.drinkType || undefined,
          price: formData.price || undefined,
          currency: formData.currency || undefined,
          rating: formData.rating,
          notes: formData.notes || undefined,
          tasteTagIds: selectedTags,
        },
      })

      await router.invalidate()
      setIsEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this visit")
    } finally {
      setIsSubmitting(false)
    }
  }

  const locationLabel = [visit.place?.city, visit.place?.country]
    .filter(Boolean)
    .join(", ")
  const negativeTags = tasteTags.filter((tag) => tag.category === "negative")
  const positiveTags = tasteTags.filter((tag) => tag.category === "positive")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/visits">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{visit.drinkName || "Coffee"}</h1>
          <p className="text-muted-foreground">
            {new Date(visit.visitedAt).toLocaleString()}
          </p>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        ) : null}
        <DeleteConfirmation
          title="Delete this visit?"
          description="This action cannot be undone."
          onConfirm={handleDelete}
        />
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="place">Cafe</Label>
                <Select
                  value={formData.placeId || null}
                  onValueChange={(value) => setFormData((current) => ({ ...current, placeId: value ?? "" }))}
                  items={[
                    { value: null, label: "Select a place" },
                    ...places.map((place) => ({
                      value: String(place.id),
                      label: `${place.name}${place.city ? ` (${place.city})` : ""}`,
                    })),
                  ]}
                >
                  <SelectTrigger id="place">
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
                    value={formData.beanId || null}
                    onValueChange={(value) => setFormData((current) => ({ ...current, beanId: value ?? "" }))}
                    items={[
                      { value: null, label: "Select beans" },
                      ...beans.map((bean) => ({ value: String(bean.id), label: bean.name })),
                    ]}
                  >
                    <SelectTrigger id="bean">
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
                <div className="space-y-2">
                  <Label htmlFor="drinkName">Drink Name</Label>
                  <Input
                    id="drinkName"
                    placeholder="e.g., House Blend Latte"
                    value={formData.drinkName}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, drinkName: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drinkType">Type</Label>
                  <Select
                    value={formData.drinkType}
                    onValueChange={(value) =>
                      setFormData((current) => ({ ...current, drinkType: value ?? "" }))
                    }
                  >
                    <SelectTrigger id="drinkType">
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

                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    inputMode="decimal"
                    placeholder="4.50"
                    value={formData.price}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, price: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData((current) => ({ ...current, currency: value ?? "EUR" }))
                    }
                  >
                    <SelectTrigger id="currency">
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
                  onChange={(rating) => setFormData((current) => ({ ...current, rating }))}
                />
              </div>

              {negativeTags.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-destructive">Issues</Label>
                  <div className="flex flex-wrap gap-2">
                    {negativeTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "destructive" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedTags.includes(tag.id) ? "" : "hover:bg-destructive/10"
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {positiveTags.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-primary">Positives</Label>
                  <div className="flex flex-wrap gap-2">
                    {positiveTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedTags.includes(tag.id) ? "" : "hover:bg-primary/10"
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="How was your experience?"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Saving..." : "Save Visit"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Visit</CardTitle>
                {visit.rating ? (
                  <StarRating value={visit.rating} readOnly />
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Drink</p>
                  <p className="font-medium">{visit.drinkName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{visit.drinkType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">
                    {visit.price ? `${visit.currency || "EUR"} ${visit.price}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Beans</p>
                  <p className="font-medium">{visit.bean?.name || "-"}</p>
                </div>
              </div>

              {visit.tasteTags.length > 0 ? (
                <>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-2">
                    {visit.tasteTags.map((tagLink) => (
                      <Badge
                        key={tagLink.id}
                        variant={tagLink.tasteTag.category === "negative" ? "destructive" : "default"}
                      >
                        {tagLink.tasteTag.name}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : null}

              {visit.notes ? (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{visit.notes}</p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cafe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visit.place ? (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{visit.place.name}</p>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link to="/places/$placeId" params={{ placeId: String(visit.place.id) }}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    {locationLabel ? (
                      <p className="text-sm text-muted-foreground">{locationLabel}</p>
                    ) : null}
                  </div>

                  {visit.place.address ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{visit.place.address}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">No place linked to this visit.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
