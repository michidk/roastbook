import { RotateCcw } from 'lucide-react'
import { DateField } from '@/components/form/date-field'
import { SelectField } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  isStatsPeriod,
  STATS_PERIOD_OPTIONS,
  type StatsFilter,
} from '@/lib/stats-filters'
import type { DetailedStats } from './stats-types'

type StatsFiltersProps = {
  readonly value: StatsFilter
  readonly available: DetailedStats['available']
  readonly onChange: (value: Partial<StatsFilter>) => void
  readonly onReset: () => void
}

export function StatsFilters({
  value,
  available,
  onChange,
  onReset,
}: StatsFiltersProps) {
  const methodOptions = available.methods.map((method) => ({
    value: String(method.id),
    label: method.name,
  }))
  const beanOptions = available.beans.map((bean) => ({
    value: String(bean.id),
    label: bean.isArchived ? `${bean.name} (archived)` : bean.name,
  }))
  const isDefault =
    value.period === '30d' &&
    value.method === undefined &&
    value.bean === undefined &&
    value.from === undefined &&
    value.to === undefined

  return (
    <Card aria-label="Statistics filters">
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <SelectField
          id="stats-period"
          label="Period"
          value={value.period}
          options={STATS_PERIOD_OPTIONS}
          onChange={(period) => {
            if (!isStatsPeriod(period)) return
            onChange({
              period,
              from: period === 'custom' ? value.from : undefined,
              to: period === 'custom' ? value.to : undefined,
            })
          }}
          required
        />
        <SelectField
          id="stats-method"
          label="Brewing method"
          value={value.method ? String(value.method) : ''}
          placeholder="All methods"
          options={methodOptions}
          onChange={(method) =>
            onChange({ method: method ? Number(method) : undefined })
          }
        />
        <SelectField
          id="stats-bean"
          label="Bean"
          value={value.bean ? String(value.bean) : ''}
          placeholder="All beans"
          options={beanOptions}
          onChange={(bean) =>
            onChange({ bean: bean ? Number(bean) : undefined })
          }
        />
        <Button
          type="button"
          variant="outline"
          disabled={isDefault}
          onClick={onReset}
        >
          <RotateCcw />
          Reset
        </Button>
        {value.period === 'custom' ? (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4">
            <DateField
              id="stats-from"
              label="From"
              value={value.from ?? ''}
              onChange={(from) => onChange({ from: from || undefined })}
            />
            <DateField
              id="stats-to"
              label="To"
              value={value.to ?? ''}
              onChange={(to) => onChange({ to: to || undefined })}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
