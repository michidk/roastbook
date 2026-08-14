import { ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import {
  type AiRequestLogEntry,
  type AiRequestLogPage,
  type AiRequestLogSummary,
  type AiRequestStatus,
  getAiRequestLog,
  getAiRequestLogs,
} from '@/lib/server/ai-request-logs'

const PAGE_SIZE = 20

function requestTypeLabel(requestType: string): string {
  return requestType
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function statusLabel(status: AiRequestStatus): string {
  if (status === 'in_progress') return 'In progress'
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`
}

function statusVariant(
  status: AiRequestStatus,
): 'default' | 'destructive' | 'outline' | 'secondary' {
  if (status === 'succeeded') return 'secondary'
  if (status === 'failed') return 'destructive'
  if (status === 'aborted') return 'outline'
  return 'default'
}

function jsonText(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function JsonPayload({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-foreground">
      {jsonText(value)}
    </pre>
  )
}

function AiRequestEntry({ entry }: { entry: AiRequestLogSummary }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<AiRequestLogEntry | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const formatDateTime = useDateTimeFormatter()
  const formatNumber = useNumberFormatter()

  const loadDetail = async () => {
    if (isLoadingDetail) return
    setIsLoadingDetail(true)
    setDetailError(null)
    try {
      setDetail(await getAiRequestLog({ data: entry.id }))
    } catch (loadError) {
      setDetailError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load this AI request',
      )
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen && detail === null) void loadDetail()
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={changeOpen}
      className="overflow-hidden rounded-2xl border border-border"
    >
      <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold">
              {requestTypeLabel(entry.requestType)}
            </span>
            <Badge variant={statusVariant(entry.status)}>
              {statusLabel(entry.status)}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {formatDateTime(entry.createdAt)} · {entry.model} ·{' '}
            {formatNumber(entry.totalTokens)} tokens
          </p>
        </div>
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-data-[open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {open ? (
          <div className="space-y-5 border-t border-border px-4 py-4">
            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Input tokens</dt>
                <dd className="mt-1 font-bold">
                  {formatNumber(entry.promptTokens)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Output tokens</dt>
                <dd className="mt-1 font-bold">
                  {formatNumber(entry.completionTokens)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total tokens</dt>
                <dd className="mt-1 font-bold">
                  {formatNumber(entry.totalTokens)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="mt-1 font-bold">
                  {entry.durationMs === null
                    ? '—'
                    : `${formatNumber(entry.durationMs)} ms`}
                </dd>
              </div>
            </dl>

            {entry.errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text"
              >
                {entry.errorMessage}
              </div>
            ) : null}

            {isLoadingDetail ? (
              <div
                className="flex min-h-32 items-center justify-center gap-2 text-muted-foreground"
                role="status"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading raw payloads…
              </div>
            ) : null}

            {detailError ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{detailError}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadDetail()}
                >
                  <RefreshCw aria-hidden="true" />
                  Retry
                </Button>
              </div>
            ) : null}

            {detail ? (
              <>
                <section aria-labelledby={`ai-request-${entry.id}`}>
                  <h3
                    id={`ai-request-${entry.id}`}
                    className="mb-2 font-display text-sm font-bold"
                  >
                    Raw input
                  </h3>
                  <JsonPayload value={detail.requestPayload} />
                </section>

                <section aria-labelledby={`ai-response-${entry.id}`}>
                  <h3
                    id={`ai-response-${entry.id}`}
                    className="mb-2 font-display text-sm font-bold"
                  >
                    Raw output
                  </h3>
                  {detail.responsePayload === null ? (
                    <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                      No response has been recorded yet.
                    </p>
                  ) : (
                    <JsonPayload value={detail.responsePayload} />
                  )}
                </section>
              </>
            ) : null}
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AiRequestLogDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [page, setPage] = useState<AiRequestLogPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadFirstPage = useCallback(async () => {
    setPage(null)
    setError(null)
    try {
      setPage(await getAiRequestLogs({ data: { limit: PAGE_SIZE } }))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load AI requests',
      )
    }
  }, [])

  useEffect(() => {
    if (open) void loadFirstPage()
  }, [open, loadFirstPage])

  const loadMore = async () => {
    if (page?.nextCursor === null || page === null || isLoadingMore) return
    setIsLoadingMore(true)
    setError(null)
    try {
      const nextPage = await getAiRequestLogs({
        data: { cursor: page.nextCursor, limit: PAGE_SIZE },
      })
      setPage({
        items: [...page.items, ...nextPage.items],
        nextCursor: nextPage.nextCursor,
      })
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load more AI requests',
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>AI request log</DialogTitle>
          <DialogDescription>
            Inspect the raw application payload, response events, errors, and
            token usage for every AI run. Image inputs include their full base64
            data.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {page === null && error === null ? (
            <div
              className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading AI requests…
            </div>
          ) : null}

          {page?.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
              <p className="font-display font-bold">No AI requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New extraction and research requests will appear here.
              </p>
            </div>
          ) : null}

          {page?.items.map((entry) => (
            <AiRequestEntry key={entry.id} entry={entry} />
          ))}

          {error ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-text sm:flex-row sm:items-center sm:justify-between"
            >
              <span>{error}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadFirstPage()}
              >
                <RefreshCw aria-hidden="true" />
                Retry
              </Button>
            </div>
          ) : null}

          {page?.nextCursor !== null && page !== null ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
