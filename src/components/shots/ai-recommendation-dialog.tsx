import { Badge } from '@roastbook/ui/badge'
import { Button } from '@roastbook/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@roastbook/ui/dialog'
import { ScrollArea } from '@roastbook/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@roastbook/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@roastbook/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@roastbook/ui/tooltip'
import {
  ArrowRight,
  CircleCheck,
  History,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { AiThinking } from '@/components/ai-thinking'
import {
  NoteBlock,
  ParameterChip,
  RichText,
} from '@/components/shots/recommendation-blocks'
import { RecommendationChat } from '@/components/shots/recommendation-chat'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useFeatureAvailability } from '@/hooks/use-feature-availability'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  getShotRecommendation,
  getShotRecommendationOptions,
} from '@/lib/client/ai-recommendations'
import { getErrorMessage } from '@/lib/error-message'
import {
  isFocusedShotRecommendationRequest,
  type ShotRecommendationRequest,
} from '@/lib/shot-recommendation'
import { cn } from '@/lib/utils'

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
  showDisabledReason = false,
}: {
  readonly request: ShotRecommendationRequest | null
  readonly enabled: boolean
  readonly className?: string
  readonly size?: 'sm' | 'default' | 'lg'
  /**
   * Print why the button is disabled under it. Hover titles never show on
   * touch screens, so forms opt in to visible text.
   */
  readonly showDisabledReason?: boolean
}) {
  const posthog = usePostHog()
  const availability = useFeatureAvailability('ai', enabled)
  const [options, setOptions] = useState<
    Awaited<ReturnType<typeof getShotRecommendationOptions>>
  >([])
  const [selection, setSelection] = useState<number | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [activeRequest, setActiveRequest] = useState(request)
  const selectedOption = options.find(
    (option) => option.historyShotId === selection,
  )
  const methods = [
    ...new Map(
      options.map((option) => [
        option.brewingMethodId,
        option.brewingMethodName,
      ]),
    ).entries(),
  ]
  const setups = options.filter(
    (option) => option.brewingMethodId === selectedOption?.brewingMethodId,
  )
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [mobilePane, setMobilePane] = useState<'recommendation' | 'chat'>(
    'recommendation',
  )
  const isFocusedShot = request
    ? isFocusedShotRecommendationRequest(request)
    : false

  const loadRecommendation = async (data = activeRequest) => {
    if (!data) return
    setActiveRequest(data)
    setChoosing(false)
    setLoading(true)
    setError(null)
    setResult(null)
    setMobilePane('recommendation')
    try {
      const recommendationResult = await getShotRecommendation({ data })
      setResult(recommendationResult)
      posthog.capture('ai_recommendation_generated', {
        recommendation_mode: isFocusedShotRecommendationRequest(data)
          ? 'focused_brew'
          : 'next_brew',
        diagnosis: recommendationResult.recommendation.diagnosis,
        change_count: recommendationResult.recommendation.changes.length,
        history_included: recommendationResult.basis.historyIncluded,
        history_truncated: recommendationResult.basis.historyTruncated,
      })
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not generate a recommendation'))
    } finally {
      setLoading(false)
    }
  }

  const startRecommendation = async () => {
    if (!request) return
    setOpen(true)
    setLoading(true)
    setError(null)
    setResult(null)
    setChoosing(false)
    setActiveRequest(request)
    try {
      const choices = await getShotRecommendationOptions({ data: request })
      setOptions(choices)
      setSelection(choices[0]?.historyShotId ?? null)
      if (choices.length > 1) {
        setChoosing(true)
      } else {
        await loadRecommendation(request)
      }
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not load brew history'))
    } finally {
      setLoading(false)
    }
  }

  const buttonTitle = !availability.available
    ? availability.reason
    : !request
      ? 'Choose beans and a brewing method first'
      : undefined
  const helpText = isFocusedShot
    ? 'Assesses this brew and suggests the next adjustment. Uses its beans, method, exact gear, parameters, tasting result, and matching history.'
    : 'Suggests the next controlled brew adjustment from the latest completed brew for the selected beans and its history. Unsaved form values are not used.'

  const visibleDisabledReason = showDisabledReason ? buttonTitle : undefined

  // Without a configured AI provider there is nothing to offer, so no button at all.
  if (!enabled) return null

  return (
    <>
      <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
        <Tooltip>
          <TooltipTrigger>
            <Button
              type="button"
              variant="outline"
              size={size}
              className={className ? 'min-w-0 flex-1' : undefined}
              disabled={!request || !availability.available}
              title={visibleDisabledReason ? undefined : buttonTitle}
              onClick={() => {
                void startRecommendation()
              }}
            >
              <Sparkles />
              AI Recommendation
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            className="w-72 items-start rounded-lg border border-border bg-popover p-3 text-sm leading-relaxed text-muted-foreground shadow-coffee"
          >
            {helpText}
          </TooltipContent>
        </Tooltip>
        {visibleDisabledReason ? (
          <p className="basis-full text-center text-xs text-muted-foreground">
            {visibleDisabledReason}
          </p>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'sm:max-w-2xl lg:max-w-5xl',
            // A fixed height keeps the chat from resizing the dialog as it
            // grows or when switching tabs on a phone.
            result &&
              'h-[calc(100dvh-2rem)] lg:h-[min(46rem,calc(100dvh-2rem))]',
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {isFocusedShot ? 'AI opinion on this brew' : 'AI recommendation'}
            </DialogTitle>
            <DialogDescription
              className={cn(result && !DEMO_MODE && 'max-sm:sr-only')}
            >
              {DEMO_MODE
                ? 'Preset demo response. Edits and custom questions are not analyzed. No AI provider is contacted.'
                : isFocusedShot
                  ? 'An assessment of this specific brew and a next-brew adjustment based on its beans, brewing method, exact gear, tasting result, and matching history.'
                  : 'A next-brew adjustment based on the latest completed brew for these beans, its brewing method and exact gear setup, and matching history. Unsaved form values are not used.'}
            </DialogDescription>
          </DialogHeader>
          {result && request ? (
            <div data-slot="dialog-body" className="flex min-h-0 flex-col">
              <Tabs
                value={mobilePane}
                onValueChange={(value) =>
                  setMobilePane(value === 'chat' ? 'chat' : 'recommendation')
                }
                className="border-b border-border/70 px-5 py-3 sm:px-6 lg:hidden"
              >
                <TabsList className="h-11 w-full">
                  <TabsTrigger value="recommendation">
                    Recommendation
                  </TabsTrigger>
                  <TabsTrigger value="chat">Ask a follow-up</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-2 lg:divide-x lg:divide-border/70">
                <RecommendationChat
                  request={activeRequest ?? request}
                  recommendation={result.recommendation}
                  className={
                    mobilePane === 'chat' ? undefined : 'hidden lg:flex'
                  }
                />
                <ScrollArea
                  className={cn(
                    'min-h-0',
                    mobilePane === 'recommendation'
                      ? undefined
                      : 'hidden lg:block',
                  )}
                  viewportClassName="px-5 py-5 sm:px-6"
                >
                  <RecommendationResultView
                    result={result}
                    isFocusedShot={isFocusedShot}
                  />
                </ScrollArea>
              </div>
            </div>
          ) : (
            <DialogBody>
              {choosing ? (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Choose which brews to use. The latest brew's method and
                    setup are preselected.
                  </p>
                  {methods.length > 1 ? (
                    <div className="space-y-2">
                      <p
                        id="recommendation-method-label"
                        className="text-sm font-medium"
                      >
                        Brew type
                      </p>
                      <Select
                        value={selectedOption?.brewingMethodId}
                        onValueChange={(value) =>
                          setSelection(
                            options.find(
                              (option) => option.brewingMethodId === value,
                            )?.historyShotId ?? null,
                          )
                        }
                      >
                        <SelectTrigger aria-labelledby="recommendation-method-label">
                          <SelectValue>
                            {selectedOption?.brewingMethodName}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {methods.map(([id, name]) => (
                            <SelectItem key={id} value={id}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="font-medium">
                      {selectedOption?.brewingMethodName}
                    </p>
                  )}
                  {setups.length > 1 ? (
                    <div className="space-y-2">
                      <p
                        id="recommendation-setup-label"
                        className="text-sm font-medium"
                      >
                        Equipment setup
                      </p>
                      <Select value={selection} onValueChange={setSelection}>
                        <SelectTrigger
                          aria-labelledby="recommendation-setup-label"
                          className="h-auto min-h-11 whitespace-normal"
                        >
                          <SelectValue>{selectedOption?.setupName}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {setups.map((option) => (
                            <SelectItem
                              key={option.historyShotId}
                              value={option.historyShotId}
                            >
                              {option.setupName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedOption?.setupName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Only history for these beans, this brew type, and this exact
                    setup will be sent to the AI.
                  </p>
                </div>
              ) : loading ? (
                <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                  <AiThinking
                    className="font-medium"
                    label={
                      isFocusedShot
                        ? 'Thinking about this brew…'
                        : 'Thinking about your next brew…'
                    }
                  />
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Comparing settings, extraction, strength, and flavor
                    development.
                  </p>
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
                    onClick={() => void startRecommendation()}
                  >
                    <RefreshCw />
                    Try again
                  </Button>
                </div>
              ) : null}
            </DialogBody>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Close
            </DialogClose>
            {choosing &&
            request &&
            !isFocusedShotRecommendationRequest(request) ? (
              <Button
                type="button"
                disabled={!selectedOption}
                onClick={() => {
                  if (selectedOption)
                    void loadRecommendation({
                      ...request,
                      brewingMethodId: selectedOption.brewingMethodId,
                      historyShotId: selectedOption.historyShotId,
                    })
                }}
              >
                Generate recommendation
              </Button>
            ) : null}
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

function RecommendationResultView({
  result,
  isFocusedShot,
}: {
  readonly result: RecommendationResult
  readonly isFocusedShot: boolean
}) {
  const formatDate = useDateFormatter()

  const { recommendation } = result

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-xl leading-snug font-bold">
          <RichText text={recommendation.headline} />
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {DIAGNOSIS_LABELS[recommendation.diagnosis]}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {recommendation.confidence} confidence
          </Badge>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Next brew</h4>
        {recommendation.changes.length === 0 ? (
          <p className="flex gap-2 text-sm text-positive-text">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            No parameter change is recommended. Repeat{' '}
            {isFocusedShot ? 'this' : 'the latest'} brew as consistently as
            possible.
          </p>
        ) : null}
        <ul className="divide-y divide-border/70 border-y border-border/70">
          {recommendation.changes.map((change) => (
            <li
              key={change.parameter}
              className="space-y-1 bg-primary/8 px-2 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <ParameterChip
                  parameter={change.parameter}
                  className="text-sm"
                />
                <p className="flex items-center gap-2 text-sm tabular-nums">
                  <span className="sr-only">from </span>
                  <span className="text-muted-foreground">
                    {change.currentValue}
                  </span>
                  <ArrowRight aria-hidden className="size-4 text-primary" />
                  <span className="sr-only">to </span>
                  <span className="font-bold">{change.recommendedValue}</span>
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <RichText text={change.reason} />
              </p>
            </li>
          ))}
          {recommendation.keepConstant.map((item) => (
            <li key={item.parameter} className="space-y-0.5 px-2 py-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <ParameterChip parameter={item.parameter} className="text-sm" />
                <p className="text-sm tabular-nums">
                  <span className="sr-only">keep at </span>
                  {item.currentValue}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <RichText text={item.reason} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Why</h4>
        <ul className="space-y-2">
          {recommendation.reasoning.map((point, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the points never change once received
            <li key={index} className="flex gap-2.5 leading-relaxed">
              <span
                aria-hidden
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span>
                <RichText text={point} />
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border/70 pt-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <History aria-hidden className="size-4 text-primary" />
            {isFocusedShot
              ? 'How this brew compares'
              : 'How this setup developed'}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <RichText text={recommendation.historyInsight} />
          </p>
        </div>
      </section>

      <NoteBlock text={result.recommendation.caveat} />

      <p className="text-xs text-muted-foreground">
        Based on {result.basis.historyIncluded} of{' '}
        {result.basis.matchingShotCount} matching brew
        {result.basis.matchingShotCount === 1 ? '' : 's'} for{' '}
        {result.basis.beanName} · {result.basis.brewingMethodName}
        {result.basis.gearNames.length > 0
          ? ` · ${result.basis.gearNames.join(', ')}`
          : ' · no gear recorded'}
        {result.basis.focusedShotAt
          ? ` · focused ${formatDate(result.basis.focusedShotAt)}`
          : result.basis.latestShotAt
            ? ` · latest ${formatDate(result.basis.latestShotAt)}`
            : ''}
        {result.basis.historyTruncated ? ' · recent history limit applied' : ''}
      </p>
    </div>
  )
}
