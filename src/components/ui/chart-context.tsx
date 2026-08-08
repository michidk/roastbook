import * as React from "react"

export const CHART_THEMES = [
  ["light", ""],
  ["dark", ".dark"],
] as const

type ChartTheme = (typeof CHART_THEMES)[number][0]

export type ChartConfig = {
  readonly [key: string]: {
    readonly label?: React.ReactNode
    readonly icon?: React.ComponentType
  } & (
    | { readonly color?: string; readonly theme?: never }
    | { readonly color?: never; readonly theme: Record<ChartTheme, string> }
  )
}

type ChartContextValue = {
  readonly config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function ChartProvider({
  children,
  config,
}: {
  readonly children: React.ReactNode
  readonly config: ChartConfig
}) {
  return <ChartContext.Provider value={{ config }}>{children}</ChartContext.Provider>
}

export function useChart(): ChartContextValue {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}
