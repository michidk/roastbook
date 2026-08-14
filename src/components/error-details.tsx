import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ErrorDetailsProps {
  error: Error
}

export function ErrorDetails({ error }: ErrorDetailsProps) {
  const [copied, setCopied] = useState(false)
  const details = error.stack || error.message

  if (!details) return null

  const copyDetails = async () => {
    let didCopy = false

    try {
      await navigator.clipboard.writeText(details)
      didCopy = true
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = details
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      didCopy = document.execCommand('copy')
      textarea.remove()
    }

    if (didCopy) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <details className="group mt-4">
      <summary className="cursor-pointer text-xs text-muted-foreground">
        Error details
      </summary>
      <div className="relative mt-2">
        <ScrollArea className="h-64 rounded-lg border bg-muted">
          <pre className="min-w-0 p-3 pr-12 text-xs whitespace-pre-wrap break-words">
            <code>{details}</code>
          </pre>
        </ScrollArea>
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="absolute right-2 top-2"
          aria-label={copied ? 'Error details copied' : 'Copy error details'}
          title={copied ? 'Copied' : 'Copy error details'}
          onClick={() => void copyDetails()}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </details>
  )
}
