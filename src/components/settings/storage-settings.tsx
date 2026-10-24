import { Globe2, HardDrive, Images } from 'lucide-react'
import type { ComponentType } from 'react'
import { SettingsPanelSection } from '@/components/settings/settings-shell'
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
    <SettingsPanelSection
      title="Storage"
      description="Live media usage for this installation."
      action={<HardDrive className="size-5 text-link" />}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        <InternalStat
          label="Stored images"
          value={storageValue(storage.imageCount, formatNumber)}
          detail={storageDetail(storage.available, 'physical files')}
          icon={Images}
        />
        <InternalStat
          label="Cached favicons"
          value={storageValue(storage.faviconCount, formatNumber)}
          detail={storageDetail(storage.available, 'website icons')}
          icon={Globe2}
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
            `${storage.provider.toUpperCase()} storage`,
          )}
          icon={HardDrive}
        />
      </dl>
    </SettingsPanelSection>
  )
}
