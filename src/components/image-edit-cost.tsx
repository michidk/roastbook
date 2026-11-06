import { z } from 'zod'
import type { JsonValue } from '@/lib/json-value'

const accountingSchema = z.object({
  totalCost: z.number().nonnegative().nullable(),
  pricing: z.object({ version: z.string(), source: z.url() }).nullable(),
})
export function ImageEditCost({ value }: { readonly value: JsonValue }) {
  const result = accountingSchema.safeParse(value)
  if (!result.success) return null
  const { totalCost, pricing } = result.data
  return (
    <p className="text-sm text-muted-foreground">
      Image edit cost:{' '}
      {totalCost === null
        ? 'Unknown. Check your provider invoice.'
        : new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
            maximumFractionDigits: 6,
          }).format(totalCost)}
      {pricing && (
        <>
          {' '}
          ·{' '}
          <a
            href={pricing.source}
            target="_blank"
            rel="noreferrer"
            className="text-link underline"
          >
            {pricing.version}
          </a>
        </>
      )}
    </p>
  )
}
