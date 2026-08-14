import { Store } from 'lucide-react'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { getStoredFaviconUrl, type WebsiteEntityType } from '@/lib/favicon'
import { cn } from '@/lib/utils'

export function WebsiteLogo({
  className,
  entityId,
  entityType,
  updatedAt,
  website,
}: {
  readonly className?: string
  readonly entityId: number
  readonly entityType: WebsiteEntityType
  readonly updatedAt: Date | string
  readonly website?: string | null
}) {
  return (
    <ImageWithFallback
      src={getStoredFaviconUrl({
        entityId,
        entityType,
        updatedAt,
        website,
      })}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      fallback={<Store aria-hidden className="size-1/2" />}
      className={cn(
        'size-11 shrink-0 rounded-xl border border-border bg-card object-contain p-1.5',
        className,
      )}
    />
  )
}
