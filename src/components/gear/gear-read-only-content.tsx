import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  ShotsTable,
  type ShotsTableServerPagination,
} from '@/components/shots/shots-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import {
  BASKET_KIND_OPTIONS,
  BREWER_FLOW_CONTROL_OPTIONS,
  BREWER_MECHANISM_OPTIONS,
  currentMachineSettingRevision,
  GRINDER_ADJUSTMENT_TYPE_OPTIONS,
  GRINDER_BEAN_FEED_OPTIONS,
  GRINDER_BREW_RANGE_OPTIONS,
  GRINDER_BURR_MATERIAL_OPTIONS,
  GRINDER_BURR_MECHANISM_OPTIONS,
  GRINDER_DOSE_CONTROL_MODE_OPTIONS,
  KETTLE_SPOUT_TYPE_OPTIONS,
  KETTLE_TEMPERATURE_CONTROL_OPTIONS,
  MACHINE_FLOW_CONTROL_OPTIONS,
  MACHINE_HEATING_ARCHITECTURE_OPTIONS,
  MACHINE_PREINFUSION_CONTROL_OPTIONS,
  MACHINE_PRESSURE_CONTROL_OPTIONS,
  MACHINE_PUMP_TYPE_OPTIONS,
  MACHINE_STEAM_SYSTEM_OPTIONS,
  MACHINE_TEMPERATURE_CONTROL_OPTIONS,
  MACHINE_WATER_SOURCE_OPTIONS,
  optionLabel,
  SHOT_STOP_MODE_OPTIONS,
  TAMPER_BASE_SHAPE_OPTIONS,
  TAMPER_FORCE_CONTROL_OPTIONS,
  WDT_DEPTH_CONTROL_OPTIONS,
} from '@/lib/gear-properties'
import type { getGearById } from '@/lib/server/gear'
import type { getGearShotPage } from '@/lib/server/shots'

type Gear = NonNullable<Awaited<ReturnType<typeof getGearById>>>

type DetailRow = {
  readonly label: string
  readonly value: ReactNode | null
}

function booleanValue(value: boolean | null | undefined) {
  return value === null || value === undefined ? null : value ? 'Yes' : 'No'
}

function setValue(
  values: readonly string[] | null | undefined,
  labels: readonly { readonly value: string; readonly label: string }[],
) {
  if (values === null || values === undefined) return null
  if (values.length === 0) return 'None'
  return values.map((value) => optionLabel(labels, value) ?? value).join(', ')
}

function DetailsCard({
  title,
  description,
  rows,
}: {
  readonly title: string
  readonly description?: string
  readonly rows: readonly DetailRow[]
}) {
  const visibleRows = rows.filter((row) => row.value !== null)
  if (visibleRows.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {visibleRows.map((row) => (
            <div key={row.label}>
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function MachinePropertyCards({ gear }: { readonly gear: Gear }) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const details = gear.espressoMachineDetails
  const owner = currentMachineSettingRevision(
    gear.machineSettingRevisions,
    'owner',
  )
  const factory = currentMachineSettingRevision(
    gear.machineSettingRevisions,
    'factory',
  )
  const measurement = (value: string | null | undefined, unit: string) =>
    value === null || value === undefined
      ? null
      : `${formatNumber(value)} ${unit}`
  const settingRows = (settings: typeof owner): readonly DetailRow[] => [
    {
      label: 'Brew pressure',
      value: measurement(settings?.brewPressureBar, 'bar'),
    },
    {
      label: 'Pre-infusion enabled',
      value: booleanValue(settings?.preinfusionEnabled),
    },
    {
      label: 'Pre-infusion time',
      value: measurement(settings?.preinfusionTimeSeconds, 's'),
    },
    {
      label: 'Pre-infusion pressure',
      value: measurement(settings?.preinfusionPressureBar, 'bar'),
    },
    {
      label: 'Flow limit',
      value: measurement(settings?.flowLimitMlPerSecond, 'mL/s'),
    },
    {
      label: 'Brew temperature offset',
      value: measurement(settings?.brewTemperatureOffsetCelsius, '°C'),
    },
    {
      label: 'Programmed volume',
      value: measurement(settings?.programmedVolumeMl, 'mL'),
    },
    {
      label: 'Default stop mode',
      value: optionLabel(SHOT_STOP_MODE_OPTIONS, settings?.defaultStopMode),
    },
    {
      label: 'Steam temperature',
      value: measurement(settings?.steamTemperatureCelsius, '°C'),
    },
    {
      label: 'Steam pressure',
      value: measurement(settings?.steamPressureBar, 'bar'),
    },
  ]

  return (
    <>
      <DetailsCard
        title="Machine capabilities"
        rows={[
          {
            label: 'Portafilter diameter',
            value: measurement(details?.portafilterDiameterMm, 'mm'),
          },
          {
            label: 'Heating architecture',
            value: optionLabel(
              MACHINE_HEATING_ARCHITECTURE_OPTIONS,
              details?.heatingArchitecture,
            ),
          },
          {
            label: 'Temperature control',
            value: optionLabel(
              MACHINE_TEMPERATURE_CONTROL_OPTIONS,
              details?.temperatureControl,
            ),
          },
          {
            label: 'Pressure control',
            value: optionLabel(
              MACHINE_PRESSURE_CONTROL_OPTIONS,
              details?.pressureControl,
            ),
          },
          {
            label: 'Flow control',
            value: optionLabel(
              MACHINE_FLOW_CONTROL_OPTIONS,
              details?.flowControl,
            ),
          },
          {
            label: 'Pre-infusion control',
            value: optionLabel(
              MACHINE_PREINFUSION_CONTROL_OPTIONS,
              details?.preinfusionControl,
            ),
          },
          {
            label: 'Supported shot stop modes',
            value: setValue(details?.shotStopModes, SHOT_STOP_MODE_OPTIONS),
          },
          {
            label: 'Steam system',
            value: optionLabel(
              MACHINE_STEAM_SYSTEM_OPTIONS,
              details?.steamSystem,
            ),
          },
          {
            label: 'Simultaneous brew and steam',
            value: booleanValue(details?.simultaneousBrewAndSteam),
          },
          { label: 'Group count', value: details?.groupCount ?? null },
          {
            label: 'Pump type',
            value: optionLabel(MACHINE_PUMP_TYPE_OPTIONS, details?.pumpType),
          },
          {
            label: 'Supported water sources',
            value: setValue(
              details?.waterSourceModes,
              MACHINE_WATER_SOURCE_OPTIONS,
            ),
          },
          {
            label: 'Minimum brew pressure',
            value: measurement(details?.brewPressureMinimumBar, 'bar'),
          },
          {
            label: 'Maximum brew pressure',
            value: measurement(details?.brewPressureMaximumBar, 'bar'),
          },
          {
            label: 'Minimum brew temperature',
            value: measurement(details?.brewTemperatureMinimumCelsius, '°C'),
          },
          {
            label: 'Maximum brew temperature',
            value: measurement(details?.brewTemperatureMaximumCelsius, '°C'),
          },
        ]}
      />
      <DetailsCard
        title="Current setup"
        description={
          owner ? `Current since ${formatDate(owner.effectiveFrom)}` : undefined
        }
        rows={settingRows(owner)}
      />
      <DetailsCard
        title="Factory defaults"
        description="Documented defaults, separate from the current setup."
        rows={settingRows(factory)}
      />
    </>
  )
}

function SubtypePropertyCards({ gear }: { readonly gear: Gear }) {
  const formatNumber = useNumberFormatter()
  const measurement = (value: string | null | undefined, unit: string) =>
    value === null || value === undefined
      ? null
      : `${formatNumber(value)} ${unit}`
  const grinder = gear.grinderDetails
  const brewer = gear.brewerDetails
  const kettle = gear.kettleDetails
  const scale = gear.scaleDetails
  const tamper = gear.tamperDetails
  const wdt = gear.wdtDetails
  const basket = gear.basketDetails

  return (
    <>
      <DetailsCard
        title="Grinder specifications"
        rows={[
          {
            label: 'Grinding mechanism',
            value: optionLabel(
              GRINDER_BURR_MECHANISM_OPTIONS,
              grinder?.burrMechanism,
            ),
          },
          {
            label: 'Burr diameter',
            value: measurement(grinder?.burrDiameterMm, 'mm'),
          },
          {
            label: 'Adjustment type',
            value: optionLabel(
              GRINDER_ADJUSTMENT_TYPE_OPTIONS,
              grinder?.adjustmentType,
            ),
          },
          {
            label: 'Supported brew range',
            value: setValue(grinder?.brewRange, GRINDER_BREW_RANGE_OPTIONS),
          },
          {
            label: 'Bean feed',
            value: optionLabel(GRINDER_BEAN_FEED_OPTIONS, grinder?.beanFeed),
          },
          {
            label: 'Dose control modes',
            value: setValue(
              grinder?.doseControlModes,
              GRINDER_DOSE_CONTROL_MODE_OPTIONS,
            ),
          },
          {
            label: 'Burr material',
            value: optionLabel(
              GRINDER_BURR_MATERIAL_OPTIONS,
              grinder?.burrMaterial,
            ),
          },
        ]}
      />
      <DetailsCard
        title="Brewer specifications"
        rows={[
          {
            label: 'Brewing mechanism',
            value: optionLabel(BREWER_MECHANISM_OPTIONS, brewer?.mechanism),
          },
          {
            label: 'Capacity',
            value: measurement(brewer?.capacityMl, 'mL'),
          },
          { label: 'Filter format', value: brewer?.filterFormat ?? null },
          {
            label: 'Flow control',
            value: optionLabel(
              BREWER_FLOW_CONTROL_OPTIONS,
              brewer?.flowControl,
            ),
          },
        ]}
      />
      <DetailsCard
        title="Kettle specifications"
        rows={[
          {
            label: 'Capacity',
            value: measurement(kettle?.capacityMl, 'mL'),
          },
          {
            label: 'Spout type',
            value: optionLabel(KETTLE_SPOUT_TYPE_OPTIONS, kettle?.spoutType),
          },
          {
            label: 'Temperature control',
            value: optionLabel(
              KETTLE_TEMPERATURE_CONTROL_OPTIONS,
              kettle?.temperatureControl,
            ),
          },
          {
            label: 'Minimum temperature',
            value: measurement(kettle?.minimumTemperatureCelsius, '°C'),
          },
          {
            label: 'Maximum temperature',
            value: measurement(kettle?.maximumTemperatureCelsius, '°C'),
          },
          {
            label: 'Temperature hold',
            value: booleanValue(kettle?.supportsTemperatureHold),
          },
        ]}
      />
      <DetailsCard
        title="Scale specifications"
        rows={[
          {
            label: 'Resolution',
            value: measurement(scale?.resolutionGrams, 'g'),
          },
          {
            label: 'Capacity',
            value: measurement(scale?.capacityGrams, 'g'),
          },
          { label: 'Built-in timer', value: booleanValue(scale?.hasTimer) },
          {
            label: 'Auto tare',
            value: booleanValue(scale?.supportsAutoTare),
          },
          {
            label: 'Automatic timer',
            value: booleanValue(scale?.supportsAutoTimer),
          },
          {
            label: 'Flow-rate display',
            value: booleanValue(scale?.hasFlowRateDisplay),
          },
        ]}
      />
      <DetailsCard
        title="Tamper specifications"
        rows={[
          {
            label: 'Base diameter',
            value: measurement(tamper?.diameterMm, 'mm'),
          },
          {
            label: 'Force control',
            value: optionLabel(
              TAMPER_FORCE_CONTROL_OPTIONS,
              tamper?.forceControl,
            ),
          },
          {
            label: 'Base shape',
            value: optionLabel(TAMPER_BASE_SHAPE_OPTIONS, tamper?.baseShape),
          },
          {
            label: 'Self-leveling',
            value: booleanValue(tamper?.selfLeveling),
          },
        ]}
      />
      <DetailsCard
        title="WDT specifications"
        rows={[
          {
            label: 'Needle diameter',
            value: measurement(wdt?.needleDiameterMm, 'mm'),
          },
          { label: 'Needle count', value: wdt?.needleCount ?? null },
          {
            label: 'Depth control',
            value: optionLabel(WDT_DEPTH_CONTROL_OPTIONS, wdt?.depthControl),
          },
        ]}
      />
      <DetailsCard
        title="Basket specifications"
        rows={[
          {
            label: 'Diameter',
            value: measurement(basket?.diameterMm, 'mm'),
          },
          {
            label: 'Nominal dose',
            value: measurement(basket?.nominalDoseGrams, 'g'),
          },
          {
            label: 'Pressurized / dual wall',
            value: booleanValue(basket?.isPressurized),
          },
          {
            label: 'Minimum dose',
            value: measurement(basket?.doseMinimumGrams, 'g'),
          },
          {
            label: 'Maximum dose',
            value: measurement(basket?.doseMaximumGrams, 'g'),
          },
          {
            label: 'Basket kind',
            value: optionLabel(BASKET_KIND_OPTIONS, basket?.kind),
          },
        ]}
      />
    </>
  )
}

function propertyKeyLabel(propertyKey: string) {
  const name = propertyKey.split('.').at(-1) ?? propertyKey
  const words = name.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function ResearchSourcesCard({ gear }: { readonly gear: Gear }) {
  if (gear.propertyEvidence.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Research sources</CardTitle>
        <CardDescription>
          Sources accepted for the structured values above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {gear.propertyEvidence.map((evidence) => (
            <li key={evidence.id} className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {propertyKeyLabel(evidence.propertyKey)}
              </span>
              <a
                href={evidence.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 w-fit items-center gap-1.5 text-sm text-link hover:underline"
              >
                <ExternalLink className="size-3.5" />
                {evidence.sourceTitle ?? new URL(evidence.sourceUrl).hostname}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function GearReadOnlyContent({
  gear,
  shots,
  shotsPagination,
}: {
  readonly gear: Gear
  readonly shots: Awaited<ReturnType<typeof getGearShotPage>>['items']
  readonly shotsPagination: ShotsTableServerPagination
}) {
  const formatDate = useDateFormatter()
  const formatCurrency = useCurrencyFormatter()

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Brand</p>
            <p className="font-medium">{gear.brand || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Model</p>
            <p className="font-medium">{gear.model || '-'}</p>
          </div>
        </CardContent>
      </Card>
      <MachinePropertyCards gear={gear} />
      <SubtypePropertyCards gear={gear} />
      <ResearchSourcesCard gear={gear} />
      {(gear.purchaseDate || gear.purchasePrice) && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {gear.purchaseDate && (
              <div>
                <p className="text-sm text-muted-foreground">Purchase date</p>
                <p className="font-medium">{formatDate(gear.purchaseDate)}</p>
              </div>
            )}
            {gear.purchasePrice && (
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium">
                  {formatCurrency(
                    gear.purchasePrice,
                    gear.priceCurrency || 'EUR',
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {(gear.productUrl || gear.manualUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              [gear.productUrl, 'Product page'],
              [gear.manualUrl, 'Manual / documentation'],
            ].map(
              ([url, label]) =>
                url && (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 rounded text-sm text-link hover:underline"
                  >
                    <ExternalLink />
                    {label}
                  </a>
                ),
            )}
          </CardContent>
        </Card>
      )}
      {gear.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{gear.notes}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Brew history</CardTitle>
        </CardHeader>
        <CardContent>
          <ShotsTable shots={shots} serverPagination={shotsPagination} />
        </CardContent>
      </Card>
    </>
  )
}
