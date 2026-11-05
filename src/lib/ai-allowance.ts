export function aiAllowanceWeek(now = new Date()) {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
  return { start, resetAt: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) }
}
