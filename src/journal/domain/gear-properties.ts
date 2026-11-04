import { and, desc, eq, isNull, type SQL } from 'drizzle-orm'
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
  allocateJournalIds,
  db,
  type JournalMutation,
  journalInsertValues,
  owned,
} from '@/journal/platform/database'
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

type GearReader = Pick<typeof db, 'query'>
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
  gearId: number,
  kind: MachineSettingKind,
  settings: EspressoMachineSettingsInput | null,
): Promise<JournalMutation[]> {
  const current = await db.query.espressoMachineSettingRevisions.findFirst({
    where: owned(
      espressoMachineSettingRevisions,
      and(
        eq(espressoMachineSettingRevisions.gearId, gearId),
        eq(espressoMachineSettingRevisions.kind, kind),
        isNull(espressoMachineSettingRevisions.supersededAt),
      ),
    ),
    orderBy: [desc(espressoMachineSettingRevisions.effectiveFrom)],
  })
  if (settings && current && settingsMatch(current, settings)) return []
  if (!settings && !current) return []
  const mutations: JournalMutation[] = []
  const now = new Date()
  if (current) {
    mutations.push({
      statement: db
        .update(espressoMachineSettingRevisions)
        .set({ supersededAt: now })
        .where(
          owned(
            espressoMachineSettingRevisions,
            and(
              eq(espressoMachineSettingRevisions.id, current.id),
              isNull(espressoMachineSettingRevisions.supersededAt),
            ),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage: 'Machine settings changed. Reload and try again.',
    })
  }
  if (settings && !settingsAreEmpty(settings)) {
    const [id] = await allocateJournalIds(espressoMachineSettingRevisions)
    if (id === undefined) throw new Error('Could not allocate machine settings')
    mutations.push({
      statement: db
        .insert(espressoMachineSettingRevisions)
        .values(
          journalInsertValues({
            id,
            gearId,
            kind,
            ...settings,
            effectiveFrom: now,
          }),
        )
        .getSQL(),
    })
  }
  return mutations
}

function replaceDetail<TValues>(
  allowed: boolean,
  value: TValues | null | undefined,
  typeChanged: boolean,
  remove: () => SQL,
  insert: (value: TValues) => SQL,
): JournalMutation[] {
  if (value === undefined)
    return typeChanged && !allowed ? [{ statement: remove() }] : []
  const mutations: JournalMutation[] = [{ statement: remove() }]
  if (allowed && value) mutations.push({ statement: insert(value) })
  return mutations
}

export async function syncGearProperties(
  gearId: number,
  type: GearType,
  payload: GearPropertyPayload,
  typeChanged: boolean,
): Promise<JournalMutation[]> {
  const machine = isEspressoMachineGearType(type)
  const grinder = isGrinderGearType(type)
  const mutations: JournalMutation[] = []

  mutations.push(
    ...replaceDetail(
      machine,
      payload.espressoMachineDetails,
      typeChanged,
      () =>
        db
          .delete(espressoMachineDetails)
          .where(
            owned(
              espressoMachineDetails,
              eq(espressoMachineDetails.gearId, gearId),
            ),
          )
          .getSQL(),
      (value) =>
        db
          .insert(espressoMachineDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      grinder,
      payload.grinderDetails,
      typeChanged,
      () =>
        db
          .delete(grinderDetails)
          .where(owned(grinderDetails, eq(grinderDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(grinderDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      type === 'brewer',
      payload.brewerDetails,
      typeChanged,
      () =>
        db
          .delete(brewerDetails)
          .where(owned(brewerDetails, eq(brewerDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(brewerDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      type === 'kettle',
      payload.kettleDetails,
      typeChanged,
      () =>
        db
          .delete(kettleDetails)
          .where(owned(kettleDetails, eq(kettleDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(kettleDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      type === 'scale',
      payload.scaleDetails,
      typeChanged,
      () =>
        db
          .delete(scaleDetails)
          .where(owned(scaleDetails, eq(scaleDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(scaleDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      type === 'tamper',
      payload.tamperDetails,
      typeChanged,
      () =>
        db
          .delete(tamperDetails)
          .where(owned(tamperDetails, eq(tamperDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(tamperDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      type === 'wdt',
      payload.wdtDetails,
      typeChanged,
      () =>
        db
          .delete(wdtDetails)
          .where(owned(wdtDetails, eq(wdtDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(wdtDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  mutations.push(
    ...replaceDetail(
      type === 'basket',
      payload.basketDetails,
      typeChanged,
      () =>
        db
          .delete(basketDetails)
          .where(owned(basketDetails, eq(basketDetails.gearId, gearId)))
          .getSQL(),
      (value) =>
        db
          .insert(basketDetails)
          .values(journalInsertValues({ gearId, ...value }))
          .getSQL(),
    ),
  )

  if (!machine && typeChanged) {
    mutations.push({
      statement: db
        .update(espressoMachineSettingRevisions)
        .set({ supersededAt: new Date() })
        .where(
          owned(
            espressoMachineSettingRevisions,
            and(
              eq(espressoMachineSettingRevisions.gearId, gearId),
              isNull(espressoMachineSettingRevisions.supersededAt),
            ),
          ),
        )
        .getSQL(),
    })
  } else if (machine) {
    if (payload.ownerMachineSettings !== undefined) {
      mutations.push(
        ...(await syncMachineSettingRevision(
          gearId,
          'owner',
          payload.ownerMachineSettings,
        )),
      )
    }
    if (payload.factoryMachineSettings !== undefined) {
      mutations.push(
        ...(await syncMachineSettingRevision(
          gearId,
          'factory',
          payload.factoryMachineSettings,
        )),
      )
    }
  }
  if (payload.propertyEvidence?.length) {
    const ids = await allocateJournalIds(
      gearPropertyEvidence,
      payload.propertyEvidence.length,
    )
    const rows = ids.map((id, index) => {
      const evidence = payload.propertyEvidence?.[index]
      if (!evidence) throw new Error('Could not allocate gear evidence')
      return {
        id,
        gearId,
        ...evidence,
        valueJson: toJsonValue(evidence.valueJson),
      }
    })
    for (let offset = 0; offset < rows.length; offset += 5) {
      mutations.push({
        statement: db
          .insert(gearPropertyEvidence)
          .values(journalInsertValues(rows.slice(offset, offset + 5)))
          .getSQL(),
      })
    }
  }
  return mutations
}

export async function findCurrentOwnerMachineSettingRevisionId(
  reader: GearReader,
  gearId: number | null | undefined,
) {
  if (!gearId) return null
  const revision = await reader.query.espressoMachineSettingRevisions.findFirst(
    {
      where: owned(
        espressoMachineSettingRevisions,
        and(
          eq(espressoMachineSettingRevisions.gearId, gearId),
          eq(espressoMachineSettingRevisions.kind, 'owner'),
          isNull(espressoMachineSettingRevisions.supersededAt),
        ),
      ),
      columns: { id: true },
      orderBy: [desc(espressoMachineSettingRevisions.effectiveFrom)],
    },
  )
  return revision?.id ?? null
}
