import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNumberFormatter } from '@/hooks/use-number-formatter'

const TARGET_SECONDS = 30

type ShotTimerProps = {
  readonly value: string
  readonly running: boolean
  readonly announcement: string
  readonly onReset: () => void
  readonly onToggle: () => void
}

export function ShotTimer({
  value,
  running,
  announcement,
  onReset,
  onToggle,
}: ShotTimerProps) {
  const formatNumber = useNumberFormatter()
  const canonicalValue = value || '0.0'
  const displayValue = formatNumber(canonicalValue)
  const seconds = Number(canonicalValue) || 0
  const progress = Math.min(seconds / TARGET_SECONDS, 1)
  const isOverTarget = seconds >= TARGET_SECONDS
  const overtimeProgress =
    (Math.max(seconds - TARGET_SECONDS, 0) % TARGET_SECONDS) / TARGET_SECONDS
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - progress)
  const overtimeStrokeOffset = circumference * (1 - overtimeProgress)
  return (
    <div className="flex flex-col items-center rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-coffee-strong">
      <div
        role="timer"
        aria-label={`${displayValue} seconds`}
        className="relative flex h-48 w-48 items-center justify-center rounded-full"
      >
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 192 192"
          aria-hidden="true"
        >
          <circle
            cx="96"
            cy="96"
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--coffee-foreground) 13%, transparent)"
            strokeWidth="10"
          />
          <circle
            cx="96"
            cy="96"
            r={radius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-100 ease-linear motion-reduce:transition-none"
          />
          {isOverTarget ? (
            <circle
              cx="96"
              cy="96"
              r={radius}
              fill="none"
              stroke="var(--coffee-foreground)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={overtimeStrokeOffset}
              className="transition-[stroke-dashoffset] duration-100 ease-linear motion-reduce:transition-none"
            />
          ) : null}
        </svg>
        <div className="flex h-[170px] w-[170px] flex-col items-center justify-center rounded-full bg-coffee ring-1 ring-coffee-foreground/15">
          <div className="flex items-baseline gap-1 font-display font-extrabold tabular-nums">
            <span className="text-5xl leading-none">{displayValue}</span>
            <span className="text-xl text-coffee-foreground/70">s</span>
          </div>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em]">
            {running
              ? isOverTarget
                ? 'Over target'
                : 'Extracting'
              : seconds > 0
                ? 'Paused'
                : 'Ready'}
          </span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button
          type="button"
          size="icon"
          onClick={onReset}
          aria-label="Reset timer"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button type="button" onClick={onToggle} className="rounded-full px-7">
          {running ? <Pause /> : <Play />}
          {running ? 'Pause' : 'Start'}
        </Button>
      </div>
    </div>
  )
}
