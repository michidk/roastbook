import { Button } from '@roastbook/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@roastbook/ui/tooltip'
import { Loader2, WandSparkles } from 'lucide-react'
import { useId } from 'react'

const explanation =
  'Create an AI-retouched copy and use it as the main image. Your original stays available. Uses your configured AI provider and may incur a charge.'

export function BeautifyImageButton({
  compact = false,
  isBeautifying,
  disabled,
  label = 'Beautify with AI',
  onClick,
}: {
  readonly compact?: boolean
  readonly isBeautifying: boolean
  readonly disabled: boolean
  readonly label?: string
  readonly onClick: () => void
}) {
  const helpId = useId()
  return (
    <>
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            size={compact ? 'icon' : 'default'}
            variant="secondary"
            className={
              compact
                ? 'pointer-events-auto absolute bottom-1 left-1 size-7 after:absolute after:-inset-2 focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-solid focus-visible:!outline-primary'
                : undefined
            }
            disabled={disabled || isBeautifying}
            aria-busy={isBeautifying}
            aria-label={isBeautifying ? 'Beautifying picture…' : label}
            aria-describedby={compact ? undefined : helpId}
            onClick={onClick}
          >
            {isBeautifying ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <WandSparkles aria-hidden="true" />
            )}
            {!compact && (isBeautifying ? 'Beautifying…' : 'Beautify with AI')}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="leading-relaxed">
          {explanation} You can keep using Roastbook while it runs.
        </TooltipContent>
      </Tooltip>
      {!compact && (
        <p
          id={helpId}
          className="w-full max-w-prose text-center text-xs leading-relaxed text-muted-foreground"
        >
          {explanation} You can keep using Roastbook while it runs. Keep this
          tab open.
        </p>
      )}
    </>
  )
}
