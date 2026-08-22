import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Bean, CalendarDays, MapPin, Scale } from 'lucide-react'
import { ImageWithFallback } from '@/components/image-with-fallback'
import {
  Card,
  CardContent,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { estimateRemainingBeanWeight } from '@/lib/bean-weight'
import {
  BEAN_TYPE_LABELS,
  getProcessMethodLabel,
  getRoastLevelLabel,
} from '@/lib/constants'
import { thumbnailUrl } from '@/lib/image-url'
import type { getBeans } from '@/lib/server/beans'

type BeanRecord = Awaited<ReturnType<typeof getBeans>>[number] & {
  readonly usedWeightGrams?: string
}

type BeanCardProps = {
  readonly bean: BeanRecord
  readonly showRemainingEstimate?: boolean
}

export function BeanCard({ bean, showRemainingEstimate }: BeanCardProps) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const thumbnail =
    bean.images.find((image) => image.isThumbnail) ?? bean.images[0]
  const roastLabel = bean.roastLevel
    ? getRoastLevelLabel(bean.roastLevel)
    : null
  const roasterName = bean.roasterRef?.name ?? bean.roaster
  const origin = [bean.region, bean.origin].filter(Boolean).join(', ')
  const process = bean.process ? getProcessMethodLabel(bean.process) : null
  const originAndProcess =
    origin && process ? `${origin} · ${process}` : origin || process || null
  const bagWeight = parseBagWeight(bean.weight)
  const weightEstimate = showRemainingEstimate
    ? estimateRemainingBeanWeight(bean.weight, bean.usedWeightGrams)
    : null
  const roastDate = bean.roastDate ? formatDate(bean.roastDate) : null
  const remainingLabel = weightEstimate
    ? `${formatNumber(weightEstimate.remainingWeight.toFixed(0))} g remaining`
    : null

  return (
    <Link
      to="/beans/$beanId"
      params={{ beanId: String(bean.id) }}
      aria-label={`View ${bean.name}${remainingLabel ? `, estimated ${remainingLabel}` : ''}`}
      className={`${interactiveCardLinkClassName} rounded-2xl`}
    >
      <Card
        size="sm"
        className={`relative isolate min-w-0 overflow-hidden rounded-2xl border-0 bg-coffee p-0 text-white shadow-none ${bean.isArchived ? 'h-[20rem] lg:h-[19rem]' : 'h-[23rem] sm:h-[23.5rem] lg:h-[22rem]'}`}
      >
        <div className="absolute inset-0">
          {thumbnail ? (
            <ImageWithFallback
              src={thumbnailUrl(thumbnail.storagePath)}
              alt=""
              loading="lazy"
              decoding="async"
              width={720}
              height={720}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.025] motion-reduce:group-hover:scale-none"
              fallback={
                <div className="flex size-16 items-center justify-center rounded-full border border-white/40 bg-black/60 text-white">
                  <Bean className="size-8" strokeWidth={1.5} />
                </div>
              }
            />
          ) : (
            <div
              className="flex h-full items-center justify-center bg-coffee text-white/85"
              aria-hidden="true"
            >
              <div className="flex size-16 items-center justify-center rounded-full border border-white/40 bg-black/60">
                <Bean className="size-8" strokeWidth={1.5} />
              </div>
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/90"
            aria-hidden="true"
          />
        </div>

        {weightEstimate ? (
          <div
            className="pointer-events-none absolute top-[4.5rem] right-4 bottom-4 z-20 flex w-10 flex-col items-center gap-2"
            aria-hidden="true"
          >
            <span className="rounded-full border border-white/50 bg-black/65 px-2 py-1 text-xs font-bold text-white tabular-nums backdrop-blur-[2px]">
              {formatNumber(weightEstimate.percentRemaining)}%
            </span>
            <span className="relative min-h-0 w-2 flex-1 overflow-hidden rounded-full border border-white/45 bg-black/45 backdrop-blur-[2px]">
              <span
                className="absolute inset-x-0 bottom-0 rounded-full bg-white transition-[height] duration-200 motion-reduce:transition-none"
                style={{ height: `${weightEstimate.percentRemaining}%` }}
              />
            </span>
          </div>
        ) : null}

        <div className="relative z-10 flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {bean.type && (
                <span className="flex min-h-9 items-center rounded-full border border-white/60 bg-black/65 px-3 py-1.5 text-xs font-bold tracking-[0.04em] text-white uppercase backdrop-blur-[2px]">
                  {BEAN_TYPE_LABELS[bean.type]}
                </span>
              )}
              {roastLabel && (
                <span className="flex min-h-9 items-center rounded-full border border-white/60 bg-black/65 px-3 py-1.5 text-xs font-bold tracking-[0.04em] text-white uppercase backdrop-blur-[2px]">
                  {roastLabel}
                </span>
              )}
            </div>
            <span className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-white/60 bg-black/55 text-white transition-[background-color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-black/70 motion-reduce:group-hover:translate-none">
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </span>
          </div>

          <CardContent
            className={`mt-auto p-0 ${weightEstimate ? 'pr-14' : ''}`}
          >
            {roasterName && (
              <p className="mb-1 truncate text-sm font-bold tracking-[0.1em] text-white/90 uppercase">
                {roasterName}
              </p>
            )}
            <p className="font-display line-clamp-2 text-xl leading-[1.1] font-extrabold tracking-[-0.025em] text-white lg:text-[1.35rem]">
              {bean.name}
            </p>
            {originAndProcess && (
              <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-white/85 sm:text-base">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{originAndProcess}</span>
              </div>
            )}

            {(roastDate || bagWeight !== null) && (
              <div
                className={`mt-4 grid border-t border-white/35 pt-4 text-xs text-white/85 lg:text-base ${roastDate && bagWeight !== null ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                {roastDate && (
                  <span className="flex min-w-0 items-center gap-2 pr-3">
                    <CalendarDays
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{roastDate}</span>
                  </span>
                )}
                {bagWeight !== null && (
                  <span
                    className={`flex min-w-0 items-center gap-2 ${roastDate ? 'border-l border-white/30 pl-4' : ''}`}
                  >
                    <Scale className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate tabular-nums">
                      {formatNumber(Math.round(bagWeight))} g
                    </span>
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}

function parseBagWeight(weight: string | null) {
  if (!weight) return null
  const parsedWeight = parseFloat(weight)
  return Number.isNaN(parsedWeight) || parsedWeight <= 0 ? null : parsedWeight
}
