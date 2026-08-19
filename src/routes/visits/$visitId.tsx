import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useRef } from 'react'
import { z } from 'zod'
import { CoffeeShopCard } from '@/components/coffee-shops/coffee-shop-card'
import { CoffeeShopMap } from '@/components/coffee-shops/coffee-shop-map'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { DetailSectionNav } from '@/components/detail-section-nav'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StarRating } from '@/components/ui/star-rating'
import { CafeVisitList } from '@/components/visits/cafe-visit-list'
import { VisitEditForm } from '@/components/visits/visit-edit-form'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { editModeSearchField } from '@/lib/edit-mode'
import { getActiveBeans } from '@/lib/server/beans'
import { deleteCafeVisit, getCafeVisit } from '@/lib/server/cafe-visits'
import { getCoffeeShop, getCoffeeShops } from '@/lib/server/coffee-shops'
import { getTasteTags } from '@/lib/server/taste-tags'
import { isNegativeTasteTag } from '@/lib/taste-tags'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/visits/$visitId')({
  validateSearch: z.object({ edit: editModeSearchField }),
  loader: async ({ params }) => {
    const visitId = Number(params.visitId)
    const visit = await getCafeVisit({ data: visitId })
    const [coffeeShops, tasteTags, beans, visitCoffeeShop] = await Promise.all([
      getCoffeeShops(),
      getTasteTags(),
      getActiveBeans(),
      visit?.coffeeShopId
        ? getCoffeeShop({ data: visit.coffeeShopId })
        : Promise.resolve(null),
    ])

    return {
      visit,
      coffeeShops,
      tasteTags,
      beans,
      cafeVisitHistory: visitCoffeeShop?.cafeVisits ?? [],
    }
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
  const { visit, coffeeShops, tasteTags, beans, cafeVisitHistory } =
    Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const navigate = useNavigate({ from: '/visits/$visitId' })
  const router = useRouter()
  const editButtonRef = useRef<HTMLAnchorElement>(null)

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
    await navigate({
      search: (current) => ({ ...current, edit: undefined }),
      replace: true,
    })
    await router.invalidate({ filter: (match) => match.routeId === Route.id })
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleCancel = () => {
    void navigate({
      search: (current) => ({ ...current, edit: undefined }),
      replace: true,
    }).then(() => editButtonRef.current?.focus())
  }

  const previousVisits = cafeVisitHistory.filter(
    (cafeVisit) => cafeVisit.id !== visit.id,
  )
  const hasCoordinates =
    visit.coffeeShop?.latitude != null && visit.coffeeShop?.longitude != null

  return (
    <Page width={isEditing ? 'form' : 'wide'}>
      <PageHeader
        size="compact"
        title={visit.drinkName || 'Coffee'}
        description={`Café visit · ${formatDateTime(visit.visitedAt)}`}
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/visits" aria-label="Back to visits">
              <ArrowLeft />
            </Link>
          </Button>
        }
        actions={
          <>
            {visit.rating ? (
              <StarRating
                value={visit.rating}
                readOnly
                sizeClassName="size-4"
              />
            ) : null}
            {!isEditing ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  ref={editButtonRef}
                  to="/visits/$visitId"
                  params={{ visitId: String(visit.id) }}
                  search={{ edit: true }}
                >
                  <Pencil />
                  Edit
                </Link>
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
          <DetailSectionNav
            links={[
              { id: 'visit-details', label: 'Details' },
              { id: 'visit-cafe', label: 'Café' },
              ...(previousVisits.length > 0
                ? [{ id: 'visit-history', label: 'Previous visits' }]
                : []),
            ]}
          />
          <div
            className={cn(
              'grid gap-6',
              hasCoordinates &&
                'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start',
            )}
          >
            <div className="min-w-0 space-y-6">
              <Card id="visit-details" className="scroll-mt-4">
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{visit.drinkType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        {visit.price
                          ? `${formatNumber(visit.price)} ${visit.currency || 'EUR'}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Beans</p>
                      {visit.bean ? (
                        <Link
                          to="/beans/$beanId"
                          params={{ beanId: String(visit.bean.id) }}
                          className="inline-flex min-h-11 items-center rounded-md font-medium text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
                        >
                          {visit.bean.name}
                        </Link>
                      ) : (
                        <p className="font-medium">-</p>
                      )}
                    </div>
                  </div>

                  {visit.tasteTags.length > 0 ? (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="mb-2 text-sm text-muted-foreground">
                          Taste
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {visit.tasteTags.map((tagLink) => (
                            <Badge
                              key={tagLink.id}
                              variant={
                                isNegativeTasteTag(tagLink.tasteTag)
                                  ? 'destructive'
                                  : 'default'
                              }
                            >
                              {tagLink.tasteTag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              {visit.notes ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{visit.notes}</p>
                  </CardContent>
                </Card>
              ) : null}

              <section
                id="visit-cafe"
                aria-labelledby="visit-cafe-heading"
                className="scroll-mt-4 space-y-3"
              >
                <h2
                  id="visit-cafe-heading"
                  className="font-display text-lg font-bold tracking-tight"
                >
                  Café
                </h2>
                {visit.coffeeShop ? (
                  <CoffeeShopCard coffeeShop={visit.coffeeShop} />
                ) : (
                  <Card>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        No café linked to this visit.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </section>

              {previousVisits.length > 0 && (
                <Card id="visit-history" className="scroll-mt-4">
                  <CardHeader>
                    <CardTitle>
                      Previous visits
                      <Badge variant="secondary" className="ml-2">
                        {previousVisits.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CafeVisitList visits={previousVisits} />
                  </CardContent>
                </Card>
              )}
            </div>

            {hasCoordinates && visit.coffeeShop && (
              <div className="lg:sticky lg:top-24">
                <CoffeeShopMap
                  coffeeShops={[visit.coffeeShop]}
                  visits={cafeVisitHistory}
                />
              </div>
            )}
          </div>
        </>
      )}
    </Page>
  )
}
