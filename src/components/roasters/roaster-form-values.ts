import { blankToNull, blankToUndefined } from '@/lib/form-value-normalization'

export type RoasterFormValues = {
  readonly name: string
  readonly location: string
  readonly country: string
  readonly website: string
  readonly instagramHandle: string
  readonly notes: string
}

type RoasterFormValueSource = {
  readonly name: string | null
  readonly location: string | null
  readonly country: string | null
  readonly website: string | null
  readonly instagramHandle: string | null
  readonly notes: string | null
}

export function createRoasterFormValues(
  source?: RoasterFormValueSource | null,
  initialName = '',
): RoasterFormValues {
  return {
    name: source?.name ?? initialName,
    location: source?.location ?? '',
    country: source?.country ?? '',
    website: source?.website ?? '',
    instagramHandle: source?.instagramHandle ?? '',
    notes: source?.notes ?? '',
  }
}

export function roasterCreatePayload(values: RoasterFormValues) {
  return {
    name: values.name,
    location: blankToUndefined(values.location),
    country: blankToUndefined(values.country),
    website: blankToUndefined(values.website),
    instagramHandle: blankToUndefined(values.instagramHandle),
    notes: blankToUndefined(values.notes),
  }
}

export function roasterUpdatePayload(id: number, values: RoasterFormValues) {
  return {
    id,
    name: values.name,
    location: blankToNull(values.location),
    country: blankToNull(values.country),
    website: blankToNull(values.website),
    instagramHandle: blankToNull(values.instagramHandle),
    notes: blankToNull(values.notes),
  }
}
