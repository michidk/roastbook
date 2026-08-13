import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { ArrowLeft, ExternalLink, MapPin, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StarRating } from "@/components/ui/star-rating"
import { getCafeVisit, deleteCafeVisit } from "@/lib/server/cafe-visits"
import { getActiveBeans } from "@/lib/server/beans"
import { getCoffeeShops } from "@/lib/server/coffee-shops"
import { getTasteTags } from "@/lib/server/taste-tags"
import { VisitEditForm } from "@/components/visits/visit-edit-form"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"

export const Route = createFileRoute("/visits/$visitId")({
  loader: async ({ params }) => {
    const visitId = Number(params.visitId)
    const [visit, coffeeShops, tasteTags, beans] = await Promise.all([
      getCafeVisit({ data: visitId }),
      getCoffeeShops(),
      getTasteTags(),
      getActiveBeans(),
    ])

    return { visit, coffeeShops, tasteTags, beans }
  },
  component: VisitDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/visits" backLabel="Back to visits" />
  ),
})

function VisitDetailPage() {
  const { visit, coffeeShops, tasteTags, beans } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)

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

  const handleSaved = async () => {
    await router.invalidate()
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleCancel = () => {
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const locationLabel = [visit.coffeeShop?.city, visit.coffeeShop?.country]
    .filter(Boolean)
    .join(", ")
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/visits" aria-label="Back to visits">
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{visit.drinkName || "Coffee"}</h1>
          <p className="text-muted-foreground">
            {new Date(visit.visitedAt).toLocaleString()}
          </p>
        </div>
        {!isEditing ? (
          <Button ref={editButtonRef} variant="outline" onClick={() => setIsEditing(true)}>
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
        <VisitEditForm
          visit={visit}
          coffeeShops={coffeeShops}
          beans={beans}
          tasteTags={tasteTags}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
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
              {visit.coffeeShop ? (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{visit.coffeeShop.name}</p>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link
                          to="/shops/$coffeeShopId"
                          params={{ coffeeShopId: String(visit.coffeeShop.id) }}
                          aria-label={`View ${visit.coffeeShop.name} details`}
                        >
                          <ExternalLink aria-hidden className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    {locationLabel ? (
                      <p className="text-sm text-muted-foreground">{locationLabel}</p>
                    ) : null}
                  </div>

                  {visit.coffeeShop.address ? (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{visit.coffeeShop.address}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">No coffee shop linked to this visit.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
