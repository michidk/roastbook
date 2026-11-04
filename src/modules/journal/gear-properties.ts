import type { JournalRow } from '@roastbook/journal-domain/model'
import { z } from 'zod'
import { isEspressoMachineGearType, isGrinderGearType } from '@/lib/constants'
import type { CommandContext } from './command-context'
import type { gearCreateSchema } from './gear-input'

export function syncLocalGearProperties(
  { tx, now }: CommandContext,
  gearId: number,
  type: JournalRow<'gear'>['type'],
  data: Partial<z.infer<typeof gearCreateSchema>>,
  changed: boolean,
) {
  function detail(
    table:
      | 'espressoMachineDetails'
      | 'grinderDetails'
      | 'brewerDetails'
      | 'kettleDetails'
      | 'scaleDetails'
      | 'tamperDetails'
      | 'wdtDetails'
      | 'basketDetails',
    allowed: boolean,
    value: unknown,
  ) {
    if (value === undefined && !changed) return
    tx.deleteWhere(table, (row) => Reflect.get(row, 'gearId') === gearId)
    if (!allowed || value === null || value === undefined) return
    // Field validation is shared with the server gear input before this boundary.
    const fields = z.record(z.string(), z.unknown()).parse(value)
    tx.insert(table, { ...fields, gearId })
  }
  detail(
    'espressoMachineDetails',
    isEspressoMachineGearType(type),
    data.espressoMachineDetails,
  )
  detail('grinderDetails', isGrinderGearType(type), data.grinderDetails)
  detail('brewerDetails', type === 'brewer', data.brewerDetails)
  detail('kettleDetails', type === 'kettle', data.kettleDetails)
  detail('scaleDetails', type === 'scale', data.scaleDetails)
  detail('tamperDetails', type === 'tamper', data.tamperDetails)
  detail('wdtDetails', type === 'wdt', data.wdtDetails)
  detail('basketDetails', type === 'basket', data.basketDetails)
  for (const kind of ['factory', 'owner'] as const) {
    const next =
      kind === 'factory'
        ? data.factoryMachineSettings
        : data.ownerMachineSettings
    if (next === undefined && !changed) continue
    const current = tx
      .rows('espressoMachineSettingRevisions')
      .find(
        (row) =>
          row.gearId === gearId &&
          row.kind === kind &&
          row.supersededAt === null,
      )
    if (
      current &&
      next &&
      Object.entries(next).every(([key, value]) => {
        const stored = Reflect.get(current, key)
        return (
          stored === value ||
          (stored !== null &&
            value !== null &&
            Number(stored) === Number(value))
        )
      })
    )
      continue
    if (current)
      tx.update('espressoMachineSettingRevisions', current.id, {
        supersededAt: now,
      })
    if (
      next &&
      isEspressoMachineGearType(type) &&
      Object.values(next).some((value) => value !== null)
    )
      tx.insert('espressoMachineSettingRevisions', {
        ...next,
        gearId,
        kind,
        effectiveFrom: now,
      })
  }
  if (data.propertyEvidence !== undefined) {
    tx.deleteWhere('gearPropertyEvidence', (row) => row.gearId === gearId)
    for (const evidence of data.propertyEvidence)
      tx.insert('gearPropertyEvidence', {
        ...evidence,
        gearId,
        acceptedAt: now,
      })
  }
}
