export type CoffeeShopFormValues = {
  readonly name: string
  readonly address: string
  readonly city: string
  readonly country: string
  readonly latitude: string
  readonly longitude: string
  readonly website: string
  readonly notes: string
}

type CoffeeShopFormValueSource = {
  readonly name: string | null
  readonly address: string | null
  readonly city: string | null
  readonly country: string | null
  readonly latitude: string | null
  readonly longitude: string | null
  readonly website: string | null
  readonly notes: string | null
}

type CoffeeShopSearchValue = {
  readonly name: string
  readonly address: string | null | undefined
  readonly city: string | null | undefined
  readonly country: string | null | undefined
  readonly latitude: string
  readonly longitude: string
  readonly website: string | null | undefined
}

export function createCoffeeShopFormValues(
  source?: CoffeeShopFormValueSource | null,
  initialName = '',
): CoffeeShopFormValues {
  return {
    name: source?.name ?? initialName,
    address: source?.address ?? '',
    city: source?.city ?? '',
    country: source?.country ?? '',
    latitude: source?.latitude ?? '',
    longitude: source?.longitude ?? '',
    website: source?.website ?? '',
    notes: source?.notes ?? '',
  }
}

export function applyCoffeeShopSearchResult<T extends CoffeeShopFormValues>(
  current: T,
  result: CoffeeShopSearchValue,
) {
  return {
    ...current,
    name: result.name || current.name,
    latitude: result.latitude,
    longitude: result.longitude,
    address: result.address ?? current.address,
    city: result.city ?? current.city,
    country: result.country ?? current.country,
    website: result.website ?? current.website,
  }
}

export function coffeeShopCreatePayload(values: CoffeeShopFormValues) {
  return {
    name: values.name,
    address: blankToUndefined(values.address),
    city: blankToUndefined(values.city),
    country: blankToUndefined(values.country),
    latitude: blankToUndefined(values.latitude),
    longitude: blankToUndefined(values.longitude),
    website: blankToUndefined(values.website),
    notes: blankToUndefined(values.notes),
  }
}

export function coffeeShopUpdatePayload(
  id: number,
  values: CoffeeShopFormValues,
) {
  return {
    id,
    name: values.name,
    address: blankToNull(values.address),
    city: blankToNull(values.city),
    country: blankToNull(values.country),
    latitude: blankToNull(values.latitude),
    longitude: blankToNull(values.longitude),
    website: blankToNull(values.website),
    notes: blankToNull(values.notes),
  }
}

import { blankToNull, blankToUndefined } from '@/lib/form-value-normalization'
