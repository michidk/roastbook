import { ExternalLink } from 'lucide-react'
import {
  ShotsTable,
  type ShotsTableServerPagination,
} from '@/components/ShotsTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import type { getGearById } from '@/lib/server/gear'
import type { getGearShotPage } from '@/lib/server/shots'

type Gear = NonNullable<Awaited<ReturnType<typeof getGearById>>>

function MachineSettingsCard({ gear }: { gear: Gear }) {
  const formatNumber = useNumberFormatter()
  if (!gear.machineSettings) return null
  const settings = gear.machineSettings
  const rows = [
    [
      'Brew pressure / OPV',
      settings.brewPressureOpvBar
        ? `${formatNumber(settings.brewPressureOpvBar)} bar`
        : 'Not set',
    ],
    [
      'Supports pre-infusion',
      settings.supportsPreinfusion === null
        ? 'Unknown'
        : settings.supportsPreinfusion
          ? 'Yes'
          : 'No',
    ],
    [
      'Pre-infusion enabled by default',
      settings.defaultPreinfusionEnabled === null
        ? 'Unknown'
        : settings.defaultPreinfusionEnabled
          ? 'Enabled'
          : 'Disabled',
    ],
    [
      'Default pre-infusion time',
      settings.defaultPreinfusionTimeSeconds
        ? `${formatNumber(settings.defaultPreinfusionTimeSeconds)} s`
        : 'Not set',
    ],
    [
      'Default pre-infusion pressure',
      settings.defaultPreinfusionPressureBar
        ? `${formatNumber(settings.defaultPreinfusionPressureBar)} bar`
        : 'Not set',
    ],
    [
      'Default flow limit',
      settings.defaultFlowLimitMlPerSecond
        ? `${formatNumber(settings.defaultFlowLimitMlPerSecond)} mL/s`
        : 'Not set',
    ],
    [
      'Temperature offset',
      settings.temperatureOffsetCelsius
        ? `${formatNumber(settings.temperatureOffsetCelsius)} °C`
        : 'Not set',
    ],
    [
      'Volumetric shot volume',
      settings.volumetricShotVolumeMl
        ? `${formatNumber(settings.volumetricShotVolumeMl)} mL`
        : 'Not set',
    ],
    [
      'Auto-stop mode',
      settings.autoStopMode
        ? settings.autoStopMode.charAt(0).toUpperCase() +
          settings.autoStopMode.slice(1)
        : 'Not set',
    ],
    [
      'Steam temperature',
      settings.steamTemperatureCelsius
        ? `${formatNumber(settings.steamTemperatureCelsius)} °C`
        : 'Not set',
    ],
    [
      'Steam pressure',
      settings.steamPressureBar
        ? `${formatNumber(settings.steamPressureBar)} bar`
        : 'Not set',
    ],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Machine settings</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export function GearReadOnlyContent({
  gear,
  shots,
  shotsPagination,
}: {
  gear: Gear
  shots: Awaited<ReturnType<typeof getGearShotPage>>['items']
  shotsPagination: ShotsTableServerPagination
}) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()

  return (
    <>
      <Card id="gear-details" className="scroll-mt-4">
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
      {gear.machineSettings && <MachineSettingsCard gear={gear} />}
      {(gear.purchaseDate || gear.purchasePrice) && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {gear.purchaseDate && (
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{formatDate(gear.purchaseDate)}</p>
              </div>
            )}
            {gear.purchasePrice && (
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium">
                  {formatNumber(gear.purchasePrice)}{' '}
                  {gear.priceCurrency || 'EUR'}
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
              [gear.productUrl, 'Product Page'],
              [gear.manualUrl, 'Manual / Documentation'],
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
      <Card id="gear-history" className="scroll-mt-4">
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
