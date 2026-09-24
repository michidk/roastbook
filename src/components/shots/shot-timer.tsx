import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { usePreferencesStore } from '@/lib/preferences-store'
import { cn } from '@/lib/utils'

/** Ring scale used while the brew has no target time of its own. */
const FALLBACK_TARGET_SECONDS = 30

function playTimerTone(frequency: number, duration = 0.12) {
  const AudioContextClass = window.AudioContext
  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.08, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration)
  oscillator.addEventListener('ended', () => void context.close())
}

type UseShotTimerOptions = {
  readonly value: string
  /** Target brew time in seconds, when the brew or its recipe defines one. */
  readonly targetSeconds?: number | null
  readonly onCommit: (value: string) => void
  /** Changing this stops the timer and re-syncs it from `value`. */
  readonly resetKey?: number | string
}

export type ShotTimerController = {
  readonly running: boolean
  readonly formattedValue: string
  readonly seconds: number
  readonly target: number
  readonly hasTarget: boolean
  readonly isOverTarget: boolean
  readonly progress: number
  readonly overtimeProgress: number
  readonly statusLabel: string
  readonly announcement: string
  readonly soundsEnabled: boolean
  readonly toggleSounds: () => void
  readonly toggle: () => void
  readonly reset: () => void
  /** The value to submit: live elapsed time while running, else the display. */
  readonly getValue: () => string
}

/**
 * Owns the timer state so the same running timer can be rendered in more
 * than one place, e.g. inline on phones and in the desktop sidebar.
 */
export function useShotTimer({
  value,
  targetSeconds,
  onCommit,
  resetKey,
}: UseShotTimerOptions): ShotTimerController {
  const formatNumber = useNumberFormatter()
  const [displayValue, setDisplayValue] = useState(value)
  const [running, setRunning] = useState(false)
  const [announcement, setAnnouncement] = useState('Timer ready')
  const soundsEnabled = usePreferencesStore((state) => state.timerSoundsEnabled)
  const setSoundsEnabled = usePreferencesStore(
    (state) => state.setTimerSoundsEnabled,
  )
  const timerStartedAt = useRef(0)
  const displayValueRef = useRef(displayValue)
  const runningRef = useRef(running)
  const targetSoundPlayed = useRef(false)
  const previousResetKey = useRef(resetKey)
  displayValueRef.current = displayValue
  runningRef.current = running

  const currentValue = useCallback(
    () =>
      runningRef.current
        ? ((performance.now() - timerStartedAt.current) / 1000).toFixed(1)
        : displayValueRef.current || '',
    [],
  )

  useEffect(() => {
    if (previousResetKey.current === resetKey) return
    previousResetKey.current = resetKey
    setRunning(false)
    setAnnouncement('Timer ready')
    targetSoundPlayed.current = false
  }, [resetKey])

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

  useEffect(() => {
    if (!running || !soundsEnabled || !hasTarget || seconds < target) return
    if (targetSoundPlayed.current) return
    targetSoundPlayed.current = true
    playTimerTone(880, 0.35)
  }, [hasTarget, running, seconds, soundsEnabled, target])

  const reset = () => {
    setRunning(false)
    setDisplayValue('')
    onCommit('')
    setAnnouncement('Timer reset')
    targetSoundPlayed.current = false
    if (soundsEnabled) playTimerTone(330)
  }

  const toggle = () => {
    if (running) {
      const nextValue = currentValue()
      setRunning(false)
      setDisplayValue(nextValue)
      onCommit(nextValue)
      setAnnouncement(`Timer paused at ${formatNumber(nextValue)} seconds`)
      if (soundsEnabled) playTimerTone(440)
      return
    }

    timerStartedAt.current =
      performance.now() - (Number(displayValue) || 0) * 1000
    setRunning(true)
    setAnnouncement('Timer started')
    targetSoundPlayed.current = seconds >= target
    if (soundsEnabled) playTimerTone(660)
  }

  const toggleSounds = () => {
    const next = !soundsEnabled
    setSoundsEnabled(next)
    if (next) playTimerTone(660)
  }

  const statusLabel = running
    ? isOverTarget
      ? 'Over target'
      : 'Extracting'
    : seconds > 0
      ? 'Paused'
      : 'Ready'

  return {
    running,
    formattedValue,
    seconds,
    target,
    hasTarget,
    isOverTarget,
    progress,
    overtimeProgress,
    statusLabel,
    announcement,
    soundsEnabled,
    toggleSounds,
    toggle,
    reset,
    getValue: currentValue,
  }
}

type ShotTimerProps = {
  readonly timer: ShotTimerController
  readonly className?: string
}

export function ShotTimer({ timer, className }: ShotTimerProps) {
  const formatNumber = useNumberFormatter()
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - timer.progress)
  const overtimeStrokeOffset = circumference * (1 - timer.overtimeProgress)

  return (
    <div
      className={cn(
        'relative flex flex-col items-center rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-coffee-strong',
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={
          timer.soundsEnabled ? 'Mute timer sounds' : 'Enable timer sounds'
        }
        aria-pressed={timer.soundsEnabled}
        onClick={timer.toggleSounds}
        className="absolute right-4 top-4 text-coffee-foreground/75 hover:bg-coffee-foreground/10 hover:text-coffee-foreground"
      >
        {timer.soundsEnabled ? <Volume2 /> : <VolumeX />}
      </Button>
      <div
        role="timer"
        aria-label={
          timer.hasTarget
            ? `${timer.formattedValue} of ${formatNumber(timer.target)} seconds`
            : `${timer.formattedValue} seconds`
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
          {timer.isOverTarget ? (
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
            <span className="text-5xl leading-none">
              {timer.formattedValue}
            </span>
            <span className="text-xl text-coffee-foreground/70">s</span>
          </div>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em]">
            {timer.statusLabel}
          </span>
          {timer.hasTarget ? (
            <span className="text-[10px] font-medium tabular-nums text-coffee-foreground/70">
              Target {formatNumber(timer.target)} s
            </span>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {timer.announcement}
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Button
          type="button"
          size="icon"
          onClick={timer.reset}
          aria-label="Reset timer"
          className="hover:border-primary hover:bg-primary/90"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          onClick={timer.toggle}
          className="h-14 w-40 rounded-full hover:border-primary hover:bg-primary/90 [@media(hover:hover)_and_(pointer:fine)]:h-14"
        >
          {timer.running ? <Pause /> : <Play />}
          {timer.running ? 'Pause' : 'Start'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Compact readout for a running timer, meant to stay pinned while the full
 * timer card is scrolled out of view.
 */
export function ShotTimerStickyBar({ timer, className }: ShotTimerProps) {
  const formatNumber = useNumberFormatter()

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-coffee px-4 py-2 text-coffee-foreground shadow-coffee-strong',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 shrink-0 rounded-full',
          timer.isOverTarget ? 'bg-destructive' : 'bg-primary',
          timer.running && 'animate-pulse motion-reduce:animate-none',
        )}
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="font-display text-2xl font-extrabold leading-none tabular-nums">
          {timer.formattedValue}
          <span className="ml-0.5 text-sm text-coffee-foreground/70">s</span>
        </span>
        <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em]">
          {timer.statusLabel}
          {timer.hasTarget ? ` · target ${formatNumber(timer.target)} s` : ''}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={timer.toggle}
        className="rounded-full hover:border-primary hover:bg-primary/90"
      >
        {timer.running ? <Pause /> : <Play />}
        {timer.running ? 'Pause' : 'Start'}
      </Button>
    </div>
  )
}
