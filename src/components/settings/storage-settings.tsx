import { HardDrive, Images } from 'lucide-react'
import type { ComponentType } from 'react'
import { PanelSection } from '@/components/section-layout'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import type { getInternalStats } from '@/lib/server/internal-stats'
import { formatBytes } from '@/lib/utils'

type StorageStats = Awaited<ReturnType<typeof getInternalStats>>['storage']

type NumberFormatter = (value: number | string, grouping?: boolean) => string

function InternalStat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly icon: ComponentType<{
    readonly className?: string
    readonly 'aria-hidden'?: boolean
  }>
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden={true} />
        <span>{label}</span>
      </dt>
      <dd className="mt-1">
        <span className="block font-display text-xl font-bold leading-none tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {detail}
        </span>
      </dd>
    </div>
  )
}

function storageValue(value: number | null, formatNumber: NumberFormatter) {
  return value === null ? '—' : formatNumber(value)
}

function storageDetail(available: boolean, detail: string) {
  return available ? detail : 'Configured storage is unavailable'
}

/** The live media usage settings section. */
export function StorageSettings({
  storage,
}: {
  readonly storage: StorageStats
}) {
  const formatNumber = useNumberFormatter()

  return (
    <PanelSection
      title="Storage"
      description="Image storage used by your journal. Usage includes compressed pictures and their thumbnails."
      action={<HardDrive className="size-5 text-link" />}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-2">
        <InternalStat
          label="Stored images"
          value={storageValue(storage.imageCount, formatNumber)}
          detail={storageDetail(storage.available, 'pictures in your journal')}
          icon={Images}
        />
        <InternalStat
          label="Storage used"
          value={
            storage.totalBytes === null
              ? '—'
              : formatBytes(storage.totalBytes, formatNumber)
          }
          detail={storageDetail(
            storage.available,
            storage.limitBytes === null
              ? 'No storage limit'
              : `of ${formatBytes(storage.limitBytes, formatNumber)} available`,
          )}
          icon={HardDrive}
        />
      </dl>
      {storage.limitBytes !== null && storage.totalBytes !== null && (
        <progress
          aria-label="Image storage used"
          value={Math.min(storage.totalBytes, storage.limitBytes)}
          max={storage.limitBytes}
          className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted accent-primary"
        />
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        Up to {storage.maxImagesPerItem} pictures per item. Uploads can be up to
        10 MiB each. Pictures are resized to at most 1,600 pixels and compressed
        to WebP before they count toward your allowance.
      </p>
      {Boolean(storage.unmeasuredImages) && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          Measuring {formatNumber(storage.unmeasuredImages ?? 0)} older
          pictures. Usage is provisional until measurement finishes. Refresh to
          continue.
        </p>
      )}
      {!storage.available && (
        <p className="mt-3 text-sm text-destructive-text" role="alert">
          Storage usage could not be loaded. Refresh to try again.
        </p>
      )}
    </PanelSection>
  )
}
