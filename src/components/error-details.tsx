import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorDetailsProps {
  error: Error
}

export function ErrorDetails({ error }: ErrorDetailsProps) {
  const [copied, setCopied] = useState(false)
  const details = error.stack || error.message

  if (!details) return null

  const copyDetails = async () => {
    await navigator.clipboard.writeText(details)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <details className="group mt-4">
      <summary className="cursor-pointer text-xs text-muted-foreground">
        Error details
      </summary>
      <div className="relative mt-2">
        <pre className="max-h-64 overflow-auto rounded-lg border bg-muted p-3 pr-12 text-xs whitespace-pre-wrap break-words">
          <code>{details}</code>
        </pre>
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="absolute right-2 top-2"
          aria-label={copied ? "Error details copied" : "Copy error details"}
          title={copied ? "Copied" : "Copy error details"}
          onClick={copyDetails}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </details>
  )
}
