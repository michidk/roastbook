import {
  ArrowRight,
  History,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { getShotRecommendation } from '@/lib/server/shot-recommendations'
import { SHOT_PARAMETER_META } from '@/lib/shot-parameters'
import type { ShotRecommendationRequest } from '@/lib/shot-recommendation'

type RecommendationResult = Awaited<ReturnType<typeof getShotRecommendation>>

const DIAGNOSIS_LABELS = {
  under_extracted_and_strong: 'Under-extracted · strong',
  under_extracted_and_weak: 'Under-extracted · weak',
  balanced: 'Sweet spot',
  over_extracted_and_strong: 'Over-extracted · strong',
  over_extracted_and_weak: 'Over-extracted · weak',
  uneven_extraction: 'Uneven extraction',
  insufficient_evidence: 'More evidence needed',
} as const

export function AiRecommendationDialog({
  request,
  enabled,
  className,
  size = 'default',
}: {
  readonly request: ShotRecommendationRequest | null
  readonly enabled: boolean
  readonly className?: string
  readonly size?: 'sm' | 'default' | 'lg'
}) {
  const formatDate = useDateFormatter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecommendationResult | null>(null)

  const loadRecommendation = async () => {
    if (!request) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await getShotRecommendation({ data: request }))
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not generate a recommendation',
      )
    } finally {
      setLoading(false)
    }
  }

  const buttonTitle = !enabled
    ? 'Configure OpenAI to enable recommendations'
    : !request
      ? 'Choose beans and a brewing method first'
      : undefined

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        disabled={!enabled || !request}
        title={buttonTitle}
        onClick={() => {
          setOpen(true)
          void loadRecommendation()
        }}
      >
        <Sparkles />
        AI Recommendation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI recommendation</DialogTitle>
            <DialogDescription>
              A next-brew adjustment based only on this bean, brewing method,
              exact gear setup, and its matching history.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {loading ? (
              <div
                className="flex min-h-56 flex-col items-center justify-center gap-3 text-center"
                aria-live="polite"
              >
                <Loader2 className="size-7 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Analyzing brew history…</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Comparing settings, extraction, strength, and flavor
                    development.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div
                className="flex min-h-56 flex-col items-center justify-center gap-4 text-center"
                role="alert"
              >
                <div>
                  <p className="font-medium">Recommendation unavailable</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {error}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadRecommendation()}
                >
                  <RefreshCw />
                  Try again
                </Button>
              </div>
            ) : result ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {DIAGNOSIS_LABELS[result.recommendation.diagnosis]}
                  </Badge>
                  <Badge variant="outline">
                    {result.recommendation.confidence} confidence
                  </Badge>
                </div>

                <section className="space-y-2">
                  <h3 className="font-display text-lg font-bold">
                    {result.recommendation.headline}
                  </h3>
                  <p className="leading-relaxed">
                    {result.recommendation.summary}
                  </p>
                </section>

                <section className="rounded-xl border border-border bg-muted/35 p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <History className="size-4 text-primary" />
                    How this setup developed
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {result.recommendation.historyInsight}
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="font-semibold">Change for the next brew</h3>
                  {result.recommendation.changes.length > 0 ? (
                    <ol className="space-y-3">
                      {result.recommendation.changes.map((change) => (
                        <li
                          key={change.parameter}
                          className="rounded-xl border border-border p-4"
                        >
                          <p className="font-medium">
                            {SHOT_PARAMETER_META[change.parameter].label}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-md bg-muted px-2 py-1">
                              {change.currentValue}
                            </span>
                            <ArrowRight
                              aria-hidden
                              className="size-4 text-muted-foreground"
                            />
                            <span className="rounded-md bg-primary/12 px-2 py-1 font-semibold text-foreground">
                              {change.recommendedValue}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {change.reason}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="rounded-xl border border-positive/35 bg-positive/10 p-4 text-sm text-positive-text">
                      No parameter change is recommended. Repeat the latest brew
                      as consistently as possible.
                    </p>
                  )}
                </section>

                {result.recommendation.keepConstant.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="font-semibold">Keep constant</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {result.recommendation.keepConstant.map((item) => (
                        <li key={item.parameter}>
                          <span className="font-medium text-foreground">
                            {SHOT_PARAMETER_META[item.parameter].label}:{' '}
                            {item.currentValue}
                          </span>{' '}
                          — {item.reason}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <div className="flex gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <p>{result.recommendation.caveat}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Based on {result.basis.historyIncluded} of{' '}
                  {result.basis.matchingShotCount} matching brew
                  {result.basis.matchingShotCount === 1 ? '' : 's'} for{' '}
                  {result.basis.beanName} · {result.basis.brewingMethodName}
                  {result.basis.gearNames.length > 0
                    ? ` · ${result.basis.gearNames.join(', ')}`
                    : ' · no gear recorded'}
                  {result.basis.latestShotAt
                    ? ` · latest ${formatDate(result.basis.latestShotAt)}`
                    : ''}
                  {result.basis.historyTruncated
                    ? ' · recent history limit applied'
                    : ''}
                </p>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Close
            </DialogClose>
            {result ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadRecommendation()}
              >
                <RefreshCw />
                Regenerate
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
