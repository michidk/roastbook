type DatedCount = { readonly date: string; readonly count: number }

type Bucket = 'day' | 'week' | 'month'

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function bucketStart(value: string, bucket: Bucket): Date {
  const date = new Date(`${value}T00:00:00Z`)
  if (bucket === 'week') {
    const weekday = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() - (weekday - 1))
  } else if (bucket === 'month') {
    date.setUTCDate(1)
  }
  return date
}

function nextBucket(date: Date, bucket: Bucket): void {
  if (bucket === 'day') date.setUTCDate(date.getUTCDate() + 1)
  else if (bucket === 'week') date.setUTCDate(date.getUTCDate() + 7)
  else date.setUTCMonth(date.getUTCMonth() + 1)
}

export function fillBucketSeries<Row extends DatedCount>(
  rows: readonly Row[],
  start: string | null,
  end: string,
  bucket: Bucket,
  empty: (date: string) => Row,
): Row[] {
  const first = start ?? rows[0]?.date
  if (!first) return []
  const current = bucketStart(first, bucket)
  const final = bucketStart(end, bucket)
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const result: Row[] = []
  while (current <= final) {
    const key = dateKey(current)
    result.push(byDate.get(key) ?? empty(key))
    nextBucket(current, bucket)
  }
  return result
}

export function calculateStreaks(
  activity: readonly DatedCount[],
  today: string,
): { readonly current: number; readonly longest: number } {
  const activeDates = [
    ...new Set(activity.filter((row) => row.count > 0).map((row) => row.date)),
  ].sort()
  if (activeDates.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let running = 1
  for (let index = 1; index < activeDates.length; index += 1) {
    const previous = new Date(`${activeDates[index - 1]}T00:00:00Z`)
    const current = new Date(`${activeDates[index]}T00:00:00Z`)
    const gap = Math.round(
      (current.getTime() - previous.getTime()) / 86_400_000,
    )
    running = gap === 1 ? running + 1 : 1
    longest = Math.max(longest, running)
  }

  const latest = activeDates.at(-1)
  if (!latest) return { current: 0, longest }
  const todayDate = new Date(`${today}T00:00:00Z`)
  const latestDate = new Date(`${latest}T00:00:00Z`)
  const latestGap = Math.round(
    (todayDate.getTime() - latestDate.getTime()) / 86_400_000,
  )
  if (latestGap > 1) return { current: 0, longest }

  let current = 1
  for (let index = activeDates.length - 1; index > 0; index -= 1) {
    const right = new Date(`${activeDates[index]}T00:00:00Z`)
    const left = new Date(`${activeDates[index - 1]}T00:00:00Z`)
    if (Math.round((right.getTime() - left.getTime()) / 86_400_000) !== 1) {
      break
    }
    current += 1
  }
  return { current, longest }
}

export function highRatingRange(
  values: readonly { readonly value: number | null; readonly rating: number }[],
): {
  readonly minimum: number
  readonly maximum: number
  readonly count: number
} | null {
  const selected = values
    .filter(
      (item): item is { readonly value: number; readonly rating: number } =>
        item.rating >= 4 && item.value !== null,
    )
    .map((item) => item.value)
  if (selected.length < 3) return null
  return {
    minimum: Math.min(...selected),
    maximum: Math.max(...selected),
    count: selected.length,
  }
}
