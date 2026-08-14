import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Coffee, Plus } from 'lucide-react'
import { z } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { ShotsTable } from '@/components/ShotsTable'
import { ShotsViewToggle } from '@/components/shots-overview'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { thumbnailUrl } from '@/lib/image-url'
import { getShotGroups, getShotPage } from '@/lib/server/shots'

const shotsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  query: z.string().max(200).default('').catch(''),
  sort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date')
    .catch('date'),
  direction: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  view: z.enum(['list', 'grouped']).default('list').catch('list'),
})

export const Route = createFileRoute('/shots/')({
  validateSearch: shotsSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
    sort: search.sort,
    direction: search.direction,
    view: search.view,
  }),
  loader: async ({ deps }) =>
    deps.view === 'grouped'
      ? {
          view: 'grouped' as const,
          result: await getShotGroups({
            data: { page: deps.page, query: deps.query },
          }),
        }
      : {
          view: 'list' as const,
          result: await getShotPage({
            data: {
              page: deps.page,
              query: deps.query,
              sort: deps.sort,
              direction: deps.direction,
            },
          }),
        },
  staleTime: 15_000,
  component: ShotsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function ShotsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/shots/' })
  const grouped = data.view === 'grouped'
  const totalItems = data.result.totalItems

  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  return (
    <Page>
      <PageHeader
        title="Shots"
        description="Your espresso shot history"
        actions={
          <>
            {totalItems > 0 && (
              <ShotsViewToggle
                grouped={grouped}
                onGroupedChange={(nextGrouped) =>
                  updateSearch({
                    view: nextGrouped ? 'grouped' : 'list',
                    page: 1,
                  })
                }
              />
            )}
            <Button asChild>
              <Link to="/shots/new">
                <Plus className="h-4 w-4" />
                Log a shot
              </Link>
            </Button>
          </>
        }
      />

      {totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Coffee}
          title="No shots logged yet"
          description="Start tracking your espresso journey"
          actionLabel="Log your first shot"
          actionHref="/shots/new"
        />
      ) : data.view === 'grouped' ? (
        <div className="space-y-4">
          {data.result.groups.map((group) => {
            const headingId = `shots-${group.key}`
            const thumbnail =
              group.shots[0]?.bean?.images?.find(
                (image) => image.isThumbnail,
              ) ?? group.shots[0]?.bean?.images?.[0]

            return (
              <section key={group.key} aria-labelledby={headingId}>
                <Card>
                  <CardHeader className="items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ImageWithFallback
                        src={
                          thumbnail
                            ? thumbnailUrl(thumbnail.storagePath)
                            : undefined
                        }
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                      <CardTitle
                        id={headingId}
                        className="text-lg leading-tight"
                      >
                        {group.bean ? (
                          <Link
                            to="/beans/$beanId"
                            params={{ beanId: String(group.bean.id) }}
                            className="inline-flex min-h-11 items-center rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {group.label}
                          </Link>
                        ) : (
                          group.label
                        )}
                      </CardTitle>
                    </div>
                    <CardAction className="self-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {group.totalShots} shot
                        {group.totalShots === 1 ? '' : 's'}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <ShotsTable shots={group.shots} hideBean />
                  </CardContent>
                </Card>
              </section>
            )
          })}
          {data.result.totalPages > 1 && (
            <PaginationControls
              page={data.result.page}
              totalPages={data.result.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ShotsTable
              shots={data.result.items}
              serverPagination={{
                page: data.result.page,
                totalPages: data.result.totalPages,
                totalItems: data.result.totalItems,
                query: search.query,
                sortKey: search.sort,
                sortDirection: search.direction,
                onPageChange: (page) => updateSearch({ page }),
                onQueryChange: (query) => updateSearch({ query, page: 1 }),
                onSort: (sort) =>
                  updateSearch({
                    sort,
                    direction:
                      search.sort === sort
                        ? search.direction === 'asc'
                          ? 'desc'
                          : 'asc'
                        : sort === 'date' || sort === 'rating'
                          ? 'desc'
                          : 'asc',
                    page: 1,
                  }),
              }}
            />
          </CardContent>
        </Card>
      )}
    </Page>
  )
}
