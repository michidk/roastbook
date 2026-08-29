import { and, desc, eq, isNull } from 'drizzle-orm'
import type { db } from '@/db'
import {
  basketDetails,
  brewerDetails,
  espressoMachineDetails,
  espressoMachineSettingRevisions,
  gearPropertyEvidence,
  grinderDetails,
  kettleDetails,
  scaleDetails,
  tamperDetails,
  wdtDetails,
} from '@/db/schema'
import {
  type GearType,
  isEspressoMachineGearType,
  isGrinderGearType,
} from '@/lib/constants'
import type {
  BasketDetailsInput,
  BrewerDetailsInput,
  EspressoMachineDetailsInput,
  EspressoMachineSettingsInput,
  GearPropertyEvidenceInput,
  GrinderDetailsInput,
  KettleDetailsInput,
  ScaleDetailsInput,
  TamperDetailsInput,
  WdtDetailsInput,
} from '@/lib/gear-property-schemas'
import { toJsonValue } from '@/lib/json-value'

export type GearPropertyPayload = {
  readonly espressoMachineDetails?: EspressoMachineDetailsInput | null
  readonly ownerMachineSettings?: EspressoMachineSettingsInput | null
  readonly factoryMachineSettings?: EspressoMachineSettingsInput | null
  readonly grinderDetails?: GrinderDetailsInput | null
  readonly brewerDetails?: BrewerDetailsInput | null
  readonly kettleDetails?: KettleDetailsInput | null
  readonly scaleDetails?: ScaleDetailsInput | null
  readonly tamperDetails?: TamperDetailsInput | null
  readonly wdtDetails?: WdtDetailsInput | null
  readonly basketDetails?: BasketDetailsInput | null
  readonly propertyEvidence?: readonly GearPropertyEvidenceInput[]
}

type GearTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type MachineSettingKind = 'factory' | 'owner'

const MACHINE_SETTING_KEYS = [
  'brewPressureBar',
  'preinfusionEnabled',
  'preinfusionTimeSeconds',
  'preinfusionPressureBar',
  'flowLimitMlPerSecond',
  'brewTemperatureOffsetCelsius',
  'programmedVolumeMl',
  'defaultStopMode',
  'steamTemperatureCelsius',
  'steamPressureBar',
] as const satisfies readonly (keyof EspressoMachineSettingsInput)[]

const MACHINE_SETTING_DECIMAL_KEYS = new Set<
  keyof EspressoMachineSettingsInput
>([
  'brewPressureBar',
  'preinfusionTimeSeconds',
  'preinfusionPressureBar',
  'flowLimitMlPerSecond',
  'brewTemperatureOffsetCelsius',
  'programmedVolumeMl',
  'steamTemperatureCelsius',
  'steamPressureBar',
])

function settingsAreEmpty(settings: EspressoMachineSettingsInput) {
  return MACHINE_SETTING_KEYS.every((key) => settings[key] === null)
}

function settingsMatch(
  current: typeof espressoMachineSettingRevisions.$inferSelect,
  next: EspressoMachineSettingsInput,
) {
  return MACHINE_SETTING_KEYS.every((key) => {
    const currentValue = current[key]
    const nextValue = next[key]
    if (currentValue === null || nextValue === null) {
      return currentValue === nextValue
    }
    if (MACHINE_SETTING_DECIMAL_KEYS.has(key)) {
      return Number(currentValue) === Number(nextValue)
    }
    return currentValue === nextValue
  })
}

async function syncMachineSettingRevision(
  tx: GearTransaction,
  gearId: number,
  kind: MachineSettingKind,
  settings: EspressoMachineSettingsInput | null,
) {
  const current = await tx.query.espressoMachineSettingRevisions.findFirst({
    where: and(
      eq(espressoMachineSettingRevisions.gearId, gearId),
      eq(espressoMachineSettingRevisions.kind, kind),
      isNull(espressoMachineSettingRevisions.supersededAt),
    ),
    orderBy: [desc(espressoMachineSettingRevisions.effectiveFrom)],
  })

  if (settings && current && settingsMatch(current, settings)) return
  if (!settings && !current) return

  const now = new Date()
  if (current) {
    await tx
      .update(espressoMachineSettingRevisions)
      .set({ supersededAt: now })
      .where(eq(espressoMachineSettingRevisions.id, current.id))
  }

  if (settings && !settingsAreEmpty(settings)) {
    await tx.insert(espressoMachineSettingRevisions).values({
      gearId,
      kind,
      ...settings,
      effectiveFrom: now,
    })
  }
}

async function replaceDetail<TValues>(
  allowed: boolean,
  value: TValues | null | undefined,
  typeChanged: boolean,
  remove: () => Promise<unknown>,
  insert: (value: TValues) => Promise<unknown>,
) {
  if (value === undefined) {
    if (typeChanged && !allowed) await remove()
    return
  }
  await remove()
  if (allowed && value) await insert(value)
}

async function supersedeCurrentMachineSettings(
  tx: GearTransaction,
  gearId: number,
) {
  await tx
    .update(espressoMachineSettingRevisions)
    .set({ supersededAt: new Date() })
    .where(
      and(
        eq(espressoMachineSettingRevisions.gearId, gearId),
        isNull(espressoMachineSettingRevisions.supersededAt),
      ),
    )
}

export async function syncGearProperties(
  tx: GearTransaction,
  gearId: number,
  type: GearType,
  payload: GearPropertyPayload,
  typeChanged: boolean,
) {
  const machine = isEspressoMachineGearType(type)
  const grinder = isGrinderGearType(type)

  await replaceDetail(
    machine,
    payload.espressoMachineDetails,
    typeChanged,
    () =>
      tx
        .delete(espressoMachineDetails)
        .where(eq(espressoMachineDetails.gearId, gearId)),
    (value) => tx.insert(espressoMachineDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    grinder,
    payload.grinderDetails,
    typeChanged,
    () => tx.delete(grinderDetails).where(eq(grinderDetails.gearId, gearId)),
    (value) => tx.insert(grinderDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    type === 'brewer',
    payload.brewerDetails,
    typeChanged,
    () => tx.delete(brewerDetails).where(eq(brewerDetails.gearId, gearId)),
    (value) => tx.insert(brewerDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    type === 'kettle',
    payload.kettleDetails,
    typeChanged,
    () => tx.delete(kettleDetails).where(eq(kettleDetails.gearId, gearId)),
    (value) => tx.insert(kettleDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    type === 'scale',
    payload.scaleDetails,
    typeChanged,
    () => tx.delete(scaleDetails).where(eq(scaleDetails.gearId, gearId)),
    (value) => tx.insert(scaleDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    type === 'tamper',
    payload.tamperDetails,
    typeChanged,
    () => tx.delete(tamperDetails).where(eq(tamperDetails.gearId, gearId)),
    (value) => tx.insert(tamperDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    type === 'wdt',
    payload.wdtDetails,
    typeChanged,
    () => tx.delete(wdtDetails).where(eq(wdtDetails.gearId, gearId)),
    (value) => tx.insert(wdtDetails).values({ gearId, ...value }),
  )
  await replaceDetail(
    type === 'basket',
    payload.basketDetails,
    typeChanged,
    () => tx.delete(basketDetails).where(eq(basketDetails.gearId, gearId)),
    (value) => tx.insert(basketDetails).values({ gearId, ...value }),
  )

  if (!machine && typeChanged) {
    await supersedeCurrentMachineSettings(tx, gearId)
  } else if (machine) {
    if (payload.ownerMachineSettings !== undefined) {
      await syncMachineSettingRevision(
        tx,
        gearId,
        'owner',
        payload.ownerMachineSettings,
      )
    }
    if (payload.factoryMachineSettings !== undefined) {
      await syncMachineSettingRevision(
        tx,
        gearId,
        'factory',
        payload.factoryMachineSettings,
      )
    }
  }

  if (payload.propertyEvidence && payload.propertyEvidence.length > 0) {
    await tx.insert(gearPropertyEvidence).values(
      payload.propertyEvidence.map((evidence) => ({
        gearId,
        ...evidence,
        valueJson: toJsonValue(evidence.valueJson),
      })),
    )
  }
}

export async function findCurrentOwnerMachineSettingRevisionId(
  tx: GearTransaction,
  gearId: number | null | undefined,
) {
  if (!gearId) return null
  const revision = await tx.query.espressoMachineSettingRevisions.findFirst({
    where: and(
      eq(espressoMachineSettingRevisions.gearId, gearId),
      eq(espressoMachineSettingRevisions.kind, 'owner'),
      isNull(espressoMachineSettingRevisions.supersededAt),
    ),
    columns: { id: true },
    orderBy: [desc(espressoMachineSettingRevisions.effectiveFrom)],
  })
  return revision?.id ?? null
}
