import { Card, CardContent, CardHeader } from '@roastbook/ui/card'
import { Skeleton } from '@roastbook/ui/skeleton'
import { ClientOnly, useRouter, useRouterState } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import { Page } from '@/components/page-layout'
import { cn } from '@/lib/utils'

// Skeletons reuse the grids and spacing of the pages they stand in for, so the
// loaded page replaces them without moving.

// Controls are 44px tall for coarse pointers, like `@roastbook/ui` controls.
const input = 'h-11 [@media(hover:hover)_and_(pointer:fine)]:h-9'
const button = 'h-11 [@media(hover:hover)_and_(pointer:fine)]:h-10'

const placeholders = (count: number) =>
  Array.from({ length: count }, (_, index) => `placeholder-${index}`)

/** Mirrors `PageHeader`: title, description, optional back button and actions. */
function HeaderPending({
  leading = false,
  actions = false,
  compact = false,
  description = true,
}: {
  readonly leading?: boolean
  readonly actions?: boolean
  readonly compact?: boolean
  readonly description?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4',
        compact ? 'sm:items-center' : 'sm:items-end',
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        {leading ? (
          <Skeleton className="size-11 shrink-0 [@media(hover:hover)_and_(pointer:fine)]:size-10" />
        ) : null}
        <div className="min-w-0 space-y-1">
          <Skeleton
            className={
              compact ? 'h-8 w-48 sm:h-9 sm:w-64' : 'h-9 w-56 md:h-12 md:w-80'
            }
          />
          {description ? <Skeleton className="h-5.5 w-64 max-w-full" /> : null}
        </div>
      </div>
      {actions ? <Skeleton className={cn(button, 'w-32 shrink-0')} /> : null}
    </div>
  )
}

/** Mirrors `CollectionToolbar`: search field and view controls. */
function ToolbarPending() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Skeleton className={cn(input, 'w-full sm:max-w-sm')} />
      <Skeleton className={cn(button, 'w-11 shrink-0 sm:w-40')} />
    </div>
  )
}

/** A titled card with label and value pairs, like a form or detail section. */
function FieldsCardPending({
  fields = 4,
  className,
}: {
  readonly fields?: number
  readonly className?: string
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className={cn('grid gap-4 sm:grid-cols-2', className)}>
        {placeholders(fields).map((placeholder) => (
          <div key={placeholder} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className={cn(input, 'w-full')} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MetricsPending({
  className,
  detail = false,
}: {
  readonly className: string
  readonly detail?: boolean
}) {
  return (
    <div className={className}>
      {placeholders(4).map((placeholder) => (
        <Card key={placeholder}>
          <CardContent className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-16 sm:h-12" />
            {detail ? <Skeleton className="h-4 w-24" /> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Any page without a closer match: a header and one card. */
export function RoutePending() {
  return (
    <Page>
      <HeaderPending />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </Page>
  )
}

/** Collections in card view (`CollectionList`): compact rows in up to three columns. */
export function ListPending() {
  return (
    <Page>
      <HeaderPending />
      <ToolbarPending />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {placeholders(9).map((placeholder) => (
          <Card key={placeholder} className="gap-0 p-0">
            <div className="flex items-center gap-3 p-3 sm:p-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}

/** The brews list: filter chips (stacked below `lg`), then taller brew cards in up to two columns. */
export function BrewsPending() {
  return (
    <Page>
      <HeaderPending />
      <div className="space-y-2 lg:hidden">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className={cn(button, 'w-2/3')} />
      </div>
      <div className="hidden lg:block">
        <ToolbarPending />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {placeholders(4).map((placeholder) => (
          <Card key={placeholder} className="gap-0 p-0">
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {placeholders(6).map((value) => (
                  <Skeleton key={value} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}

/** A record's page: back button, title, actions and its sections. */
export function DetailPending({
  width = 'form',
}: {
  readonly width?: 'form' | 'wide'
}) {
  return (
    <Page width={width}>
      <HeaderPending leading actions compact />
      <FieldsCardPending />
      <FieldsCardPending fields={2} />
    </Page>
  )
}

export function WideDetailPending() {
  return <DetailPending width="wide" />
}

/** A form to add a record: back button, title and its sections. */
export function FormPending() {
  return (
    <Page width="form">
      <HeaderPending leading />
      <FieldsCardPending />
      <FieldsCardPending fields={2} />
    </Page>
  )
}

/** The brew form: sections beside a summary column on wide screens. */
export function BrewFormPending() {
  return (
    <Page>
      <HeaderPending leading description={false} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          <FieldsCardPending />
          <FieldsCardPending />
        </div>
        <Card className="hidden lg:flex">
          <CardContent className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className={cn(input, 'w-full')} />
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

export function OverviewPending() {
  return (
    <Page>
      <HeaderPending description={false} />
      <MetricsPending className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" />
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px] lg:gap-5">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {placeholders(5).map((placeholder) => (
              <Skeleton key={placeholder} className="h-17 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            {placeholders(5).map((placeholder) => (
              <Skeleton key={placeholder} className="h-15.5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

export function StatsPending() {
  return (
    <Page>
      <HeaderPending />
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          {placeholders(3).map((placeholder) => (
            <div key={placeholder} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className={cn(input, 'w-full')} />
            </div>
          ))}
          <Skeleton className={cn(button, 'w-24')} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Skeleton className="h-58 w-full" />
        </CardContent>
      </Card>
      <MetricsPending
        detail
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {placeholders(2).map((placeholder) => (
          <Card key={placeholder}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-60 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </Page>
  )
}

/** One section page inside the settings or admin panel (`PanelSection`). */
export function PanelPending() {
  return (
    <div className="divide-y divide-border">
      {placeholders(2).map((placeholder) => (
        <div key={placeholder} className="py-5 first:pt-0 last:pb-0 sm:py-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="mt-5 space-y-4">
            <Skeleton className={cn(input, 'w-full')} />
            <Skeleton className={cn(input, 'w-2/3')} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The settings and admin panel (`SectionLayout`): navigation beside a section. */
export function SectionLayoutPending() {
  return (
    <Page>
      <HeaderPending />
      <div className="w-[calc(100vw-2rem)] min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-coffee md:w-[calc(100vw-4rem)] lg:grid lg:min-h-[620px] lg:w-full lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="flex gap-1 border-b border-border bg-secondary/45 p-3 lg:flex-col lg:border-r lg:border-b-0 lg:p-5">
          {placeholders(6).map((placeholder) => (
            <Skeleton
              key={placeholder}
              className="h-11 w-24 shrink-0 rounded-xl lg:w-full"
            />
          ))}
        </div>
        <div className="min-w-0 bg-background/35 p-4 sm:p-6 lg:p-7">
          <PanelPending />
        </div>
      </div>
    </Page>
  )
}

/** The app frame while the app and its journal open: navigation and the opened page's skeleton. */
export function AppPending() {
  const router = useRouter()
  // The outermost page route: a layout's skeleton includes its frame, which a
  // nested page's skeleton leaves to the layout.
  const routeId = useRouterState({
    select: (state) => state.matches[1]?.routeId,
  })
  const pending = routeId
    ? (router.routesById[routeId]?.options.pendingComponent as
        | ComponentType
        | undefined)
    : undefined
  // The root route's own pending component is this frame.
  const PagePending = pending && pending !== AppPending ? pending : RoutePending
  return (
    <div role="status">
      <span className="sr-only">Loading</span>
      <div className="h-14 border-b border-border bg-card lg:h-[68px]" />
      <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-8">
        <ClientOnly fallback={<RoutePending />}>
          <PagePending />
        </ClientOnly>
      </div>
    </div>
  )
}
