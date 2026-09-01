import type { StatsFilter, StatsRange } from '@/lib/stats-filters'

type RatingAverage = {
  readonly avgRating: number | null
}

type NamedRatingCount = RatingAverage & {
  readonly name: string | null
  readonly count: number
}

type MoneySummary = {
  readonly currency: string
  readonly total: number
  readonly average: number
  readonly count: number
}

type Streaks = {
  readonly current: number
  readonly longest: number
}

export type DetailedStats = {
  readonly filter: StatsFilter & {
    readonly timeZone: string
    readonly range: StatsRange
  }
  readonly available: {
    readonly methods: readonly { readonly id: number; readonly name: string }[]
    readonly beans: readonly {
      readonly id: number
      readonly name: string
      readonly isArchived: boolean
    }[]
  }
  readonly shots: {
    readonly total: number
    readonly previousTotal: number | null
    readonly avgPerDay: number
  }
  readonly beans: {
    readonly totalGramsUsed: number
    readonly previousTotalGramsUsed: number | null
    readonly uniqueBeansUsed: number
    readonly topByShots: readonly {
      readonly beanId: number
      readonly beanName: string
      readonly shotCount: number
    }[]
    readonly topByRating: readonly (RatingAverage & {
      readonly beanId: number
      readonly beanName: string
      readonly shotCount: number
    })[]
  }
  readonly brewing: {
    readonly avgDose: number | null
    readonly avgYield: number | null
    readonly avgTime: number | null
    readonly avgRatio: number | null
  }
  readonly consistency: Record<
    'dose' | 'yield' | 'time' | 'ratio',
    {
      readonly count: number
      readonly median: number | null
      readonly p25: number | null
      readonly p75: number | null
    }
  >
  readonly gear: Record<
    'brewers' | 'grinders' | 'accessories',
    readonly {
      readonly gearId: number
      readonly gearName: string
      readonly gearType: string
      readonly shotCount: number
    }[]
  >
  readonly ratings: {
    readonly average: number | null
    readonly previousAverage: number | null
    readonly totalRated: number
    readonly previousTotalRated: number | null
    readonly highRated: number
    readonly distribution: Record<1 | 2 | 3 | 4 | 5, number>
  }
  readonly trend: readonly {
    readonly date: string
    readonly count: number
    readonly averageRating: number | null
    readonly totalRated: number
    readonly highRated: number
  }[]
  readonly activityCalendar: {
    readonly end: string
    readonly days: readonly { readonly date: string; readonly count: number }[]
  }
  readonly methods: readonly (RatingAverage & {
    readonly methodId: number
    readonly methodName: string
    readonly shotCount: number
  })[]
  readonly tasteProfile: readonly (RatingAverage & {
    readonly id: number
    readonly name: string
    readonly category: string | null
    readonly count: number
    readonly extractionAxis: number | null
    readonly strengthAxis: number | null
  })[]
  readonly dialIn: readonly {
    readonly id: number
    readonly brewedAt: Date
    readonly beanId: number
    readonly beanName: string
    readonly methodId: number
    readonly methodName: string
    readonly rating: number
    readonly ratio: number | null
    readonly time: number | null
    readonly temperature: number | null
  }[]
  readonly rhythm: {
    readonly cells: readonly {
      readonly weekday: number
      readonly hour: number
      readonly count: number
    }[]
    readonly streaks: Streaks
  }
  readonly exploration: {
    readonly roasters: readonly NamedRatingCount[]
    readonly origins: readonly NamedRatingCount[]
    readonly processes: readonly NamedRatingCount[]
    readonly roastLevels: readonly NamedRatingCount[]
    readonly roastAge: readonly (NamedRatingCount & { readonly sort: number })[]
  }
  readonly cost: { readonly home: readonly MoneySummary[] }
  readonly visits: {
    readonly total: number
    readonly previousTotal: number | null
    readonly averageRating: number | null
    readonly previousAverageRating: number | null
    readonly totalRated: number
    readonly trend: readonly {
      readonly date: string
      readonly count: number
      readonly averageRating: number | null
    }[]
    readonly drinkTypes: readonly NamedRatingCount[]
    readonly cities: readonly {
      readonly name: string | null
      readonly count: number
    }[]
    readonly tasteTags: readonly (NamedRatingCount & {
      readonly id: number
      readonly category: string | null
    })[]
    readonly spend: readonly MoneySummary[]
    readonly streaks: Streaks
  }
  readonly places: {
    readonly total: number
    readonly visited: number
    readonly favorites: number
    readonly topByVisits: readonly (RatingAverage & {
      readonly coffeeShopId: number
      readonly coffeeShopName: string
      readonly city: string | null
      readonly visitCount: number
    })[]
  }
}
