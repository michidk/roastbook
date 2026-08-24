export type GearSetFormValues = {
  name: string
  description: string
  machineId: string
  grinderId: string
  basketId: string
  accessoryGearIds: number[]
}

export const EMPTY_GEAR_SET_FORM_VALUES: GearSetFormValues = {
  name: '',
  description: '',
  machineId: '',
  grinderId: '',
  basketId: '',
  accessoryGearIds: [],
}

type GearSetSource = {
  readonly name: string
  readonly description: string | null
  readonly machineId: number | null
  readonly grinderId: number | null
  readonly basketId: number | null
  readonly accessoryGearIds: readonly number[]
}

export function gearSetFormValuesFrom(
  source: GearSetSource,
): GearSetFormValues {
  return {
    name: source.name,
    description: source.description ?? '',
    machineId: source.machineId ? String(source.machineId) : '',
    grinderId: source.grinderId ? String(source.grinderId) : '',
    basketId: source.basketId ? String(source.basketId) : '',
    accessoryGearIds: [...source.accessoryGearIds],
  }
}

export function gearSetWritePayload(values: GearSetFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    machineId: values.machineId ? Number(values.machineId) : null,
    grinderId: values.grinderId ? Number(values.grinderId) : null,
    basketId: values.basketId ? Number(values.basketId) : null,
    accessoryGearIds: [...values.accessoryGearIds],
  }
}
