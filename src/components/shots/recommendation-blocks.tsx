import {
  ArrowRight,
  Gauge,
  Hand,
  Info,
  Layers,
  Lock,
  type LucideIcon,
  Scale,
  Settings2,
  SlidersHorizontal,
  Thermometer,
  Timer,
  Waves,
} from 'lucide-react'
import { Fragment } from 'react'
import type { z } from 'zod'
import { SHOT_PARAMETER_META } from '@/lib/shot-parameters'
import type {
  recommendationChangeSchema,
  recommendationKeepConstantSchema,
  SHOT_RECOMMENDATION_PARAMETER_KEYS,
} from '@/lib/shot-recommendation'
import { cn } from '@/lib/utils'

type RecommendationParameter =
  (typeof SHOT_RECOMMENDATION_PARAMETER_KEYS)[number]
type RecommendationChange = z.infer<typeof recommendationChangeSchema>
type RecommendationKeepConstant = z.infer<
  typeof recommendationKeepConstantSchema
>

const PARAMETER_ICONS: Partial<Record<RecommendationParameter, LucideIcon>> = {
  doseGrams: Scale,
  brewWaterGrams: Scale,
  yieldGrams: Scale,
  grindSetting: Settings2,
  shotTimeSeconds: Timer,
  targetTimeSeconds: Timer,
  preinfusionTimeSeconds: Timer,
  bloomTimeSeconds: Timer,
  steepTimeSeconds: Timer,
  bloomWaterGrams: Scale,
  brewTemperatureCelsius: Thermometer,
  brewPressureBar: Gauge,
  preinfusionPressureBar: Gauge,
  flowRateMlPerSecond: Waves,
  tampForceKg: Hand,
  distributionMethod: Hand,
  usesPuckScreen: Layers,
  paperFilterPosition: Layers,
}

function isParameter(key: string): key is RecommendationParameter {
  return key in SHOT_PARAMETER_META
}

/** A parameter name with its icon, for use inside a line of text. */
export function ParameterChip({
  parameter,
  className,
}: {
  readonly parameter: RecommendationParameter
  readonly className?: string
}) {
  const Icon = PARAMETER_ICONS[parameter] ?? SlidersHorizontal

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-primary/12 px-1.5 py-px align-baseline text-[0.9em] leading-snug font-medium whitespace-nowrap text-foreground',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0 text-primary" />
      {SHOT_PARAMETER_META[parameter].label}
    </span>
  )
}

/**
 * Text in which the model marks parameters as [[parameterKey]]. Unknown keys
 * are shown as plain words so a stray marker never reaches the screen.
 */
export function RichText({ text }: { readonly text: string }) {
  return text.split(/\[\[(\w+)\]\]/).map((part, index) =>
    // Odd indexes are the captured keys.
    index % 2 === 0 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the split is static
      <Fragment key={index}>{part}</Fragment>
    ) : isParameter(part) ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the split is static
      <ParameterChip key={index} parameter={part} />
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: the split is static
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}

export function ChangeBlock({
  change,
}: {
  readonly change: RecommendationChange
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <ParameterChip parameter={change.parameter} className="text-sm" />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-muted px-2 py-1">
          {change.currentValue}
        </span>
        <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="rounded-md bg-primary/12 px-2 py-1 font-semibold text-foreground">
          {change.recommendedValue}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <RichText text={change.reason} />
      </p>
    </div>
  )
}

export function KeepConstantBlock({
  item,
}: {
  readonly item: RecommendationKeepConstant
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/35 p-3 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Lock aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="font-medium">Keep</span>
        <ParameterChip parameter={item.parameter} />
        <span className="text-muted-foreground">at</span>
        <span className="rounded-md bg-muted px-2 py-0.5">
          {item.currentValue}
        </span>
      </p>
      <p className="mt-1.5 leading-relaxed text-muted-foreground">
        <RichText text={item.reason} />
      </p>
    </div>
  )
}

export function NoteBlock({ text }: { readonly text: string }) {
  return (
    <div className="flex gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <RichText text={text} />
      </p>
    </div>
  )
}
