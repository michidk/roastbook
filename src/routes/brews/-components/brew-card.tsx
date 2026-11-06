import { Card, interactiveCardLinkClassName } from '@roastbook/ui/card'
import { StarRating } from '@roastbook/ui/star-rating'
import { Link } from '@tanstack/react-router'
import {
  Bean,
  Coffee,
  Droplet,
  type LucideIcon,
  Scale,
  Settings2,
  Thermometer,
  Timer,
} from 'lucide-react'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { thumbnailUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import type { BrewsPageData } from '@/routes/brews/-lib/load-brews-page'

type Shot = Extract<
  BrewsPageData,
  { readonly view: 'list' }
>['result']['items'][number]

type Metric = {
  readonly label: string
  readonly icon: LucideIcon
  readonly value: string
}

export function BrewCard({
  shot,
  showRating,
}: {
  readonly shot: Shot
  readonly showRating: boolean
}) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const bean = shot.bean
  const image = bean?.images.find((item) => item.isThumbnail) ?? bean?.images[0]
  const ratioNumerator =
    shot.ratioBasis === 'brew_water' ? shot.brewWaterGrams : shot.yieldGrams
  const amount = (value: string | null, unit: string) =>
    value ? `${formatNumber(value)} ${unit}` : null

  const details = [
    { label: 'Bean', value: bean?.name },
    { label: 'Roaster', value: bean?.roasterRef?.name ?? bean?.roaster },
    {
      label: 'Origin',
      value: [bean?.origin, bean?.region].filter(Boolean).join(' – '),
    },
    { label: 'Process', value: bean?.process },
  ].filter((detail) => detail.value)

  const metrics = [
    { label: 'Dose', icon: Bean, value: amount(shot.doseGrams, 'g') },
    { label: 'Yield', icon: Droplet, value: amount(shot.yieldGrams, 'g') },
    {
      label: 'Water',
      icon: Droplet,
      value: shot.yieldGrams ? null : amount(shot.brewWaterGrams, 'g'),
    },
    {
      label: 'Ratio',
      icon: Scale,
      value:
        shot.doseGrams && ratioNumerator
          ? `1:${formatNumber((Number(ratioNumerator) / Number(shot.doseGrams)).toFixed(1))}`
          : null,
    },
    { label: 'Time', icon: Timer, value: amount(shot.shotTimeSeconds, 's') },
    {
      label: 'Temperature',
      icon: Thermometer,
      value: amount(shot.brewTemperatureCelsius, '°C'),
    },
    {
      label: 'Grind',
      icon: Settings2,
      value: shot.grindSetting?.trim() || null,
    },
  ].filter((metric): metric is Metric => metric.value !== null)

  return (
    <Card className="relative h-full gap-0 overflow-visible p-0">
      <Link
        to="/brews/$shotId"
        params={{ shotId: String(shot.id) }}
        aria-label={`${shot.brewingMethod.name} brew, ${formatDate(shot.brewedAt)}`}
        className={cn(interactiveCardLinkClassName, 'flex gap-4 p-4')}
      >
        <div className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Coffee aria-hidden className="size-7" />
          </span>
          <span className="font-display text-sm font-bold text-foreground">
            {shot.brewingMethod.name}
          </span>
          {showRating && shot.rating ? (
            <StarRating
              value={shot.rating}
              readOnly
              variant="compact"
              sizeClassName="size-3"
              ariaLabel="Brew rating"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start gap-3">
            {details.length === 0 ? (
              <p className="flex-1 text-sm text-muted-foreground">
                No bean recorded
              </p>
            ) : (
              <dl className="min-w-0 flex-1 space-y-1.5">
                {details.map((detail) => (
                  <div key={detail.label}>
                    <dt className="text-xs text-muted-foreground">
                      {detail.label}
                    </dt>
                    <dd className="text-sm break-words text-foreground">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {image ? (
              <ImageWithFallback
                src={thumbnailUrl(image.storagePath)}
                alt=""
                loading="lazy"
                className="size-12 shrink-0 rounded-lg object-cover"
              />
            ) : null}
          </div>

          {metrics.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {metrics.map(({ label, icon: Icon, value }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center gap-1.5 text-sm"
                >
                  <dt>
                    <Icon
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="sr-only">{label}</span>
                  </dt>
                  <dd className="truncate text-foreground tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className="mt-auto text-right text-xs text-muted-foreground">
            {formatDate(shot.brewedAt)}
          </p>
        </div>
      </Link>
    </Card>
  )
}
