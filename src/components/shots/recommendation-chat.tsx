import { MessageCircle, RefreshCw, Send } from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AiThinking } from '@/components/ai-thinking'
import {
  ChangeBlock,
  KeepConstantBlock,
  NoteBlock,
  RichText,
} from '@/components/shots/recommendation-blocks'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { chatAboutShotRecommendation } from '@/lib/client/ai-recommendations'
import { getErrorMessage } from '@/lib/error-message'
import type {
  ShotRecommendation,
  ShotRecommendationRequest,
} from '@/lib/shot-recommendation'
import {
  SHOT_RECOMMENDATION_CHAT_MAX_MESSAGES,
  SHOT_RECOMMENDATION_CHAT_MAX_QUESTION_LENGTH,
  type ShotRecommendationAnswer,
  shotRecommendationAnswerToText,
} from '@/lib/shot-recommendation-chat'
import { cn } from '@/lib/utils'

type ChatEntry =
  | { readonly role: 'user'; readonly content: string }
  | { readonly role: 'assistant'; readonly answer: ShotRecommendationAnswer }

function AnswerBlocks({
  answer,
}: {
  readonly answer: ShotRecommendationAnswer
}) {
  return (
    <div className="mr-auto w-full max-w-[95%] space-y-2">
      <span className="sr-only">Assistant: </span>
      {answer.blocks.map((block, index) => {
        // The blocks never change once received, so the position is a stable key.
        const key = index
        switch (block.type) {
          case 'text':
            return (
              <p
                key={key}
                className="w-fit max-w-full rounded-2xl bg-muted px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              >
                <RichText text={block.text} />
              </p>
            )
          case 'change':
            return <ChangeBlock key={key} change={block} />
          case 'keep':
            return <KeepConstantBlock key={key} item={block} />
          default:
            return <NoteBlock key={key} text={block.text} />
        }
      })}
    </div>
  )
}

/**
 * Follow-up questions about one recommendation. The conversation lives only in
 * this component's state, so regenerating the recommendation or closing the
 * dialog starts it over.
 */
export function RecommendationChat({
  request,
  recommendation,
  className,
}: {
  readonly request: ShotRecommendationRequest
  readonly recommendation: ShotRecommendation
  readonly className?: string
}) {
  const [entries, setEntries] = useState<ReadonlyArray<ChatEntry>>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const limitReached = entries.length >= SHOT_RECOMMENDATION_CHAT_MAX_MESSAGES
  const unaskedQuestions = recommendation.followUpQuestions.filter(
    (question) =>
      !entries.some(
        (entry) => entry.role === 'user' && entry.content === question,
      ),
  )
  const showSuggestions =
    !pending &&
    !error &&
    !limitReached &&
    unaskedQuestions.length > 0 &&
    entries.at(-1)?.role !== 'user'

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the thread or its status changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [entries, pending, error])

  const ask = async (thread: ReadonlyArray<ChatEntry>) => {
    setEntries(thread)
    setPending(true)
    setError(null)
    try {
      const { answer } = await chatAboutShotRecommendation({
        data: {
          request,
          recommendation,
          messages: thread.map((entry) => ({
            role: entry.role,
            content:
              entry.role === 'user'
                ? entry.content
                : shotRecommendationAnswerToText(entry.answer),
          })),
        },
      })
      setEntries([...thread, { role: 'assistant', answer }])
    } catch (caught) {
      setError(getErrorMessage(caught, 'Could not get an answer'))
    } finally {
      setPending(false)
    }
  }

  const send = (question: string) => {
    const content = question.trim()
    if (!content || pending || limitReached) return
    setDraft('')
    void ask([...entries, { role: 'user', content }])
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    send(draft)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return
    event.preventDefault()
    send(draft)
  }

  return (
    <section
      aria-labelledby="recommendation-chat-title"
      className={cn('flex min-h-0 flex-col', className)}
    >
      <div className="border-b border-border/70 px-5 py-3 sm:px-6">
        <h3
          id="recommendation-chat-title"
          className="flex items-center gap-2 font-semibold"
        >
          <MessageCircle aria-hidden className="size-4 text-primary" />
          Ask a follow-up
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Not saved — the conversation ends when you close this window or
          regenerate.
        </p>
      </div>

      <ScrollArea
        className="min-h-0 flex-1"
        viewportClassName="px-5 py-4 sm:px-6"
      >
        <div role="log" aria-live="polite" className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask about the reasoning, another setting you could change, or how
              to test the suggestion.
            </p>
          ) : null}
          {entries.map((entry, index) =>
            entry.role === 'user' ? (
              <div
                // The thread is append-only, so the position is a stable key.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={index}
                className="ml-auto w-fit max-w-[90%] rounded-2xl bg-primary/12 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground"
              >
                <span className="sr-only">You: </span>
                {entry.content}
              </div>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <AnswerBlocks key={index} answer={entry.answer} />
            ),
          )}
          {pending ? (
            <AiThinking className="mr-auto w-fit rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground" />
          ) : null}
          {error ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm"
            >
              <p className="min-w-0 flex-1">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void ask(entries)}
              >
                <RefreshCw />
                Try again
              </Button>
            </div>
          ) : null}
          {showSuggestions ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {unaskedQuestions.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-11 py-1.5 text-left font-normal whitespace-normal"
                  onClick={() => send(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-border/70 bg-muted/35 px-5 py-3 sm:px-6"
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={SHOT_RECOMMENDATION_CHAT_MAX_QUESTION_LENGTH}
          rows={1}
          aria-label="Your question about this recommendation"
          placeholder={
            limitReached ? 'Conversation limit reached' : 'Ask a question…'
          }
          disabled={limitReached}
          className="max-h-32 min-h-11 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send question"
          disabled={pending || limitReached || draft.trim().length === 0}
        >
          <Send />
        </Button>
      </form>
      {limitReached ? (
        <p className="border-t border-border/70 bg-muted/35 px-5 pb-3 text-xs text-muted-foreground sm:px-6">
          This conversation is full. Regenerate the recommendation to start a
          new one.
        </p>
      ) : null}
    </section>
  )
}
