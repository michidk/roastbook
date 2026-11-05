import { cn } from '@/lib/utils'

export function AiThinking({
  label = 'Thinking…',
  className,
}: {
  readonly label?: string
  readonly className?: string
}) {
  return (
    <div
      role="status"
      className={cn('inline-flex items-center gap-2.5', className)}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-primary motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
          />
        ))}
      </span>
    </div>
  )
}
