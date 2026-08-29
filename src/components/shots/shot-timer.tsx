import { Pause, Play, RotateCcw } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { useNumberFormatter } from '@/hooks/use-number-formatter'

/** Ring scale used while the brew has no target time of its own. */
const FALLBACK_TARGET_SECONDS = 30

export type ShotTimerHandle = {
  readonly getValue: () => string
}

type ShotTimerProps = {
  readonly value: string
  /** Target brew time in seconds, when the brew or its recipe defines one. */
  readonly targetSeconds?: number | null
  readonly onCommit: (value: string) => void
}

export const ShotTimer = forwardRef<ShotTimerHandle, ShotTimerProps>(
  function ShotTimer({ value, targetSeconds, onCommit }, ref) {
    const formatNumber = useNumberFormatter()
    const [displayValue, setDisplayValue] = useState(value)
    const [running, setRunning] = useState(false)
    const [announcement, setAnnouncement] = useState('Timer ready')
    const timerStartedAt = useRef(0)
    const displayValueRef = useRef(displayValue)
    const runningRef = useRef(running)
    displayValueRef.current = displayValue
    runningRef.current = running

    const currentValue = useCallback(
      () =>
        runningRef.current
          ? ((performance.now() - timerStartedAt.current) / 1000).toFixed(1)
          : displayValueRef.current || '',
      [],
    )

    useImperativeHandle(ref, () => ({ getValue: currentValue }), [currentValue])

    useEffect(() => {
      if (!running) setDisplayValue(value)
    }, [running, value])

    useEffect(() => {
      if (!running) return
      const updateDisplay = () => setDisplayValue(currentValue())
      const interval = window.setInterval(updateDisplay, 100)
      updateDisplay()
      return () => window.clearInterval(interval)
    }, [currentValue, running])

    const canonicalValue = displayValue || '0.0'
    const formattedValue = formatNumber(canonicalValue)
    const seconds = Number(canonicalValue) || 0
    const hasTarget =
      targetSeconds !== null && targetSeconds !== undefined && targetSeconds > 0
    const target = hasTarget ? targetSeconds : FALLBACK_TARGET_SECONDS
    const progress = Math.min(seconds / target, 1)
    const isOverTarget = seconds >= target
    const overtimeProgress = Math.min(Math.max(seconds - target, 0) / target, 1)
    const radius = 88
    const circumference = 2 * Math.PI * radius
    const strokeOffset = circumference * (1 - progress)
    const overtimeStrokeOffset = circumference * (1 - overtimeProgress)

    const reset = () => {
      setRunning(false)
      setDisplayValue('')
      onCommit('')
      setAnnouncement('Timer reset')
    }

    const toggle = () => {
      if (running) {
        const nextValue = currentValue()
        setRunning(false)
        setDisplayValue(nextValue)
        onCommit(nextValue)
        setAnnouncement(`Timer paused at ${formatNumber(nextValue)} seconds`)
        return
      }

      timerStartedAt.current =
        performance.now() - (Number(displayValue) || 0) * 1000
      setRunning(true)
      setAnnouncement('Timer started')
    }

    return (
      <div className="flex flex-col items-center rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-coffee-strong">
        <div
          role="timer"
          aria-label={
            hasTarget
              ? `${formattedValue} of ${formatNumber(target)} seconds`
              : `${formattedValue} seconds`
          }
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
                stroke="var(--destructive)"
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
              <span className="text-5xl leading-none">{formattedValue}</span>
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
            {hasTarget ? (
              <span className="text-[10px] font-medium tabular-nums text-coffee-foreground/70">
                Target {formatNumber(target)} s
              </span>
            ) : null}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button
            type="button"
            size="icon"
            onClick={reset}
            aria-label="Reset timer"
            className="hover:border-primary hover:bg-primary/90"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            onClick={toggle}
            className="h-14 w-40 rounded-full hover:border-primary hover:bg-primary/90 [@media(hover:hover)_and_(pointer:fine)]:h-14"
          >
            {running ? <Pause /> : <Play />}
            {running ? 'Pause' : 'Start'}
          </Button>
        </div>
      </div>
    )
  },
)
