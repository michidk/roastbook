const DAILY_HEADLINES = [
  "Dial in something delicious",
  "Make today worth savouring",
  "Pull a shot worth remembering",
  "Find today’s sweet spot",
  "Good coffee starts here",
  "Make this cup count",
  "Chase the perfect extraction",
  "Turn good beans into a great day",
  "Brew a little joy into today",
  "Your next great cup starts here",
  "Take time for a better brew",
  "Make something worth tasting",
] as const

const MILLISECONDS_PER_DAY = 86_400_000

export function getDailyHeadline(date: Date): string {
  const localDayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
      MILLISECONDS_PER_DAY,
  )

  return (
    DAILY_HEADLINES[localDayNumber % DAILY_HEADLINES.length] ??
    DAILY_HEADLINES[0]
  )
}
