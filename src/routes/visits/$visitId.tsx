import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, MapPin, Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StarRating } from '@/components/ui/star-rating'
import { VisitEditForm } from '@/components/visits/visit-edit-form'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getActiveBeans } from '@/lib/server/beans'
import { deleteCafeVisit, getCafeVisit } from '@/lib/server/cafe-visits'
import { getCoffeeShops } from '@/lib/server/coffee-shops'
import { getTasteTags } from '@/lib/server/taste-tags'

export const Route = createFileRoute('/visits/$visitId')({
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
  const formatDateTime = useDateTimeFormatter()
  const formatNumber = useNumberFormatter()
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
    navigate({ to: '/visits' })
  }

  const handleSaved = async () => {
    await router.invalidate({ filter: (match) => match.routeId === Route.id })
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleCancel = () => {
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const locationLabel = [visit.coffeeShop?.city, visit.coffeeShop?.country]
    .filter(Boolean)
    .join(', ')
  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={visit.drinkName || 'Coffee'}
        description={formatDateTime(visit.visitedAt)}
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/visits" aria-label="Back to visits">
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <>
            {!isEditing ? (
              <Button
                ref={editButtonRef}
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : null}
            <DeleteConfirmation
              title="Delete this visit?"
              description="This action cannot be undone."
              onConfirm={handleDelete}
            />
          </>
        }
      />

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
                  <p className="font-medium">{visit.drinkName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{visit.drinkType || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">
                    {visit.price
                      ? `${visit.currency || 'EUR'} ${formatNumber(visit.price)}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Beans</p>
                  <p className="font-medium">{visit.bean?.name || '-'}</p>
                </div>
              </div>

              {visit.tasteTags.length > 0 ? (
                <>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-2">
                    {visit.tasteTags.map((tagLink) => (
                      <Badge
                        key={tagLink.id}
                        variant={
                          tagLink.tasteTag.category === 'negative'
                            ? 'destructive'
                            : 'default'
                        }
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
              <CardTitle>Café</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visit.coffeeShop ? (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{visit.coffeeShop.name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8"
                      >
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
                      <p className="text-sm text-muted-foreground">
                        {locationLabel}
                      </p>
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
                <p className="text-muted-foreground">
                  No café linked to this visit.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Page>
  )
}
