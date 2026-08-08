type ActivityPoint = {
  readonly date: string
  readonly count: number
}

const ACTIVITY_WINDOW_DAYS = 30

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function fillDailyActivity(
  activity: readonly ActivityPoint[],
  today: Date,
): ActivityPoint[] {
  const counts = new Map(activity.map((point) => [point.date, point.count]))

  return Array.from({ length: ACTIVITY_WINDOW_DAYS }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (ACTIVITY_WINDOW_DAYS - index - 1))
    const key = dateKey(date)
    return { date: key, count: counts.get(key) ?? 0 }
  })
}
