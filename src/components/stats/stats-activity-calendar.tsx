import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { cn } from '@/lib/utils'
import type { DetailedStats } from './stats-types'

type ActivityDay = DetailedStats['activityCalendar']['days'][number]
type CalendarCell = ActivityDay | null

const TILE_CLASSES = [
  'border border-border/70 bg-secondary',
  'bg-coffee/25',
  'bg-coffee/45',
  'bg-coffee/70',
  'bg-coffee',
] as const

const DAY_LABELS = [
  { row: 2, label: 'Mon' },
  { row: 4, label: 'Wed' },
  { row: 6, label: 'Fri' },
] as const

function activityLevel(count: number): number {
  return Math.min(count, 4)
}

function buildWeeks(days: readonly ActivityDay[]): CalendarCell[][] {
  const first = days[0]
  if (!first) return []

  const cells: CalendarCell[] = Array.from(
    { length: new Date(`${first.date}T00:00:00Z`).getUTCDay() },
    () => null,
  )
  cells.push(...days)
  while (cells.length % 7 !== 0) cells.push(null)

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  )
}

function monthLabels(weeks: readonly CalendarCell[][]) {
  let previousMonth = ''
  return weeks.flatMap((week, weekIndex) => {
    const firstDay = week.find((day) => day !== null)
    if (!firstDay) return []
    const month = firstDay.date.slice(0, 7)
    if (month === previousMonth) return []
    previousMonth = month
    return [
      {
        weekIndex,
        label: new Intl.DateTimeFormat('en', {
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(`${firstDay.date}T00:00:00Z`)),
      },
    ]
  })
}

function countLabel(count: number, formatNumber: (value: number) => string) {
  return `${formatNumber(count)} ${count === 1 ? 'brew' : 'brews'}`
}

export function StatsActivityCalendar({
  activity,
}: {
  readonly activity: DetailedStats['activityCalendar']
}) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const weeks = buildWeeks(activity.days)
  const months = monthLabels(weeks)
  const total = activity.days.reduce((sum, day) => sum + day.count, 0)
  const activeDays = activity.days.filter((day) => day.count > 0).length
  const busiest = activity.days.reduce<ActivityDay | null>(
    (highest, day) => (!highest || day.count > highest.count ? day : highest),
    null,
  )
  const summary =
    total === 0
      ? 'No brews recorded in the last 12 months.'
      : `${countLabel(total, formatNumber)} across ${formatNumber(activeDays)} ${
          activeDays === 1 ? 'day' : 'days'
        }. ${
          busiest
            ? `Busiest day: ${formatDate(busiest.date)} with ${countLabel(
                busiest.count,
                formatNumber,
              )}.`
            : ''
        }`

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let hasAlignedToLatest = false
    const alignToLatest = () => {
      if (
        !hasAlignedToLatest &&
        container.scrollWidth > container.clientWidth
      ) {
        container.scrollLeft = container.scrollWidth
        hasAlignedToLatest = true
      }
    }
    alignToLatest()
    const observer = new ResizeObserver(alignToLatest)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <Card className="w-full min-w-0 max-w-full">
      <CardHeader>
        <CardTitle>Coffee activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          {summary} Darker tiles mean more brews that day.
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <div
          ref={scrollContainerRef}
          className="w-full max-w-full overflow-x-auto pb-2"
        >
          <div className="w-max">
            <div className="ml-8 grid h-5 grid-cols-[repeat(53,var(--activity-tile))] gap-[3px] text-xs text-muted-foreground [--activity-tile:0.625rem] sm:gap-1 sm:[--activity-tile:0.75rem]">
              {months.map((month) => (
                <span
                  key={`${month.weekIndex}-${month.label}`}
                  style={{ gridColumnStart: month.weekIndex + 1 }}
                >
                  {month.label}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div
                className="grid w-6 grid-rows-[repeat(7,var(--activity-tile))] gap-[3px] text-xs leading-none text-muted-foreground [--activity-tile:0.625rem] sm:gap-1 sm:[--activity-tile:0.75rem]"
                aria-hidden="true"
              >
                {DAY_LABELS.map((day) => (
                  <span
                    key={day.label}
                    className="self-center"
                    style={{ gridRowStart: day.row }}
                  >
                    {day.label}
                  </span>
                ))}
              </div>
              <div
                className="grid grid-flow-col grid-cols-[repeat(53,var(--activity-tile))] grid-rows-[repeat(7,var(--activity-tile))] gap-[3px] [--activity-tile:0.625rem] sm:gap-1 sm:[--activity-tile:0.75rem]"
                role="img"
                aria-label={`Coffee activity from ${formatDate(activity.start)} to ${formatDate(activity.end)}. ${summary}`}
              >
                {weeks.flatMap((week, weekIndex) =>
                  week.map((day, dayIndex) =>
                    day ? (
                      <span
                        key={day.date}
                        className={cn(
                          'size-(--activity-tile) rounded-[3px]',
                          TILE_CLASSES[activityLevel(day.count)],
                        )}
                        style={{
                          gridColumnStart: weekIndex + 1,
                          gridRowStart: dayIndex + 1,
                        }}
                        title={`${formatDate(day.date)}: ${countLabel(day.count, formatNumber)}`}
                      />
                    ) : null,
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1" aria-hidden="true">
            {TILE_CLASSES.map((className, level) => (
              <span
                key={className}
                className={cn('size-3 rounded-[3px]', className)}
                title={level === 4 ? '4 or more brews' : `${level} brews`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
