import { isCurrency } from '@/lib/app-settings'
import type { BeanType, RoastLevel } from '@/lib/constants'
import { blankToNull, blankToUndefined } from '@/lib/form-value-normalization'

export type BeanFormValues = {
  readonly createBag: boolean
  readonly alwaysOnShelf: boolean
  readonly rating: number
  readonly ratingNote: string
  readonly beanTagIds: number[]
  readonly name: string
  readonly type: BeanType | ''
  readonly isDecaf: boolean
  readonly roasterId: string
  readonly weight: string
  readonly price: string
  readonly priceCurrency: string
  readonly shopName: string
  readonly shopUrl: string
  readonly origin: string
  readonly region: string
  readonly farm: string
  readonly variety: string
  readonly altitudeMinMeters: string
  readonly altitudeMaxMeters: string
  readonly process: string
  readonly roastLevel: RoastLevel | ''
  readonly roastDate: string
  readonly notes: string
}

type BeanFormValueSource = {
  readonly alwaysOnShelf?: boolean
  readonly rating?: number | null
  readonly ratingNote?: string | null
  readonly tags?: readonly { id: number }[]
  readonly name: string | null
  readonly type: BeanType | null
  readonly isDecaf: boolean
  readonly roasterId: number | null
  readonly weight: string | null
  readonly price: string | null
  readonly priceCurrency: string | null
  readonly shopName?: string | null
  readonly shopUrl: string | null
  readonly origin: string | null
  readonly region: string | null
  readonly farm: string | null
  readonly variety: string | null
  readonly altitudeMinMeters: number | null
  readonly altitudeMaxMeters: number | null
  readonly process: string | null
  readonly roastLevel: RoastLevel | null
  readonly roastDate: string | Date | null
  readonly notes: string | null
}

export function createEmptyBeanFormValues(initialName = ''): BeanFormValues {
  return {
    name: initialName,
    createBag: true,
    alwaysOnShelf: false,
    rating: 0,
    ratingNote: '',
    beanTagIds: [],
    type: '',
    isDecaf: false,
    roasterId: '',
    weight: '',
    price: '',
    priceCurrency: 'EUR',
    shopName: '',
    shopUrl: '',
    origin: '',
    region: '',
    farm: '',
    variety: '',
    altitudeMinMeters: '',
    altitudeMaxMeters: '',
    process: '',
    roastLevel: '',
    roastDate: '',
    notes: '',
  }
}

export function toBeanFormValues(bean: BeanFormValueSource): BeanFormValues {
  return {
    name: bean.name ?? '',
    createBag: false,
    alwaysOnShelf: bean.alwaysOnShelf ?? false,
    rating: bean.rating ?? 0,
    ratingNote: bean.ratingNote ?? '',
    beanTagIds: bean.tags?.map((tag) => tag.id) ?? [],
    type: bean.type ?? '',
    isDecaf: bean.isDecaf,
    roasterId: bean.roasterId ? String(bean.roasterId) : '',
    weight: bean.weight ?? '',
    price: bean.price ?? '',
    priceCurrency: bean.priceCurrency ?? 'EUR',
    shopName: bean.shopName ?? '',
    shopUrl: bean.shopUrl ?? '',
    origin: bean.origin ?? '',
    region: bean.region ?? '',
    farm: bean.farm ?? '',
    variety: bean.variety ?? '',
    altitudeMinMeters: bean.altitudeMinMeters?.toString() ?? '',
    altitudeMaxMeters: bean.altitudeMaxMeters?.toString() ?? '',
    process: bean.process ?? '',
    roastLevel: bean.roastLevel ?? '',
    roastDate: formatRoastDate(bean.roastDate),
    notes: bean.notes ?? '',
  }
}

function optionalInteger(value: string): number | null {
  return value.trim() ? Math.round(Number(value)) : null
}

function optionalDate(value: string): Date | undefined {
  return value ? new Date(value) : undefined
}

export function beanCreatePayload(
  values: BeanFormValues,
  options: { readonly isArchived?: boolean } = {},
) {
  return {
    name: values.name,
    createBag: values.createBag,
    alwaysOnShelf: values.alwaysOnShelf,
    rating: values.rating || null,
    ratingNote: blankToNull(values.ratingNote),
    beanTagIds: values.beanTagIds,
    type: values.type || undefined,
    isDecaf: values.isDecaf,
    roasterId: values.roasterId ? Number(values.roasterId) : undefined,
    weight: blankToUndefined(values.weight),
    price: blankToUndefined(values.price),
    priceCurrency: isCurrency(values.priceCurrency)
      ? values.priceCurrency
      : undefined,
    shopName: blankToUndefined(values.shopName),
    shopUrl: blankToUndefined(values.shopUrl),
    origin: blankToUndefined(values.origin),
    region: blankToUndefined(values.region),
    farm: blankToUndefined(values.farm),
    variety: blankToUndefined(values.variety),
    altitudeMinMeters: optionalInteger(values.altitudeMinMeters) ?? undefined,
    altitudeMaxMeters: optionalInteger(values.altitudeMaxMeters) ?? undefined,
    process: blankToUndefined(values.process),
    roastLevel: values.roastLevel || undefined,
    roastDate: optionalDate(values.roastDate),
    notes: blankToUndefined(values.notes),
    isArchived: options.isArchived ?? false,
  }
}

export function beanUpdatePayload(id: number, values: BeanFormValues) {
  return {
    id,
    name: values.name,
    createBag: values.createBag,
    alwaysOnShelf: values.alwaysOnShelf,
    rating: values.rating || null,
    ratingNote: blankToNull(values.ratingNote),
    beanTagIds: values.beanTagIds,
    type: values.type || null,
    isDecaf: values.isDecaf,
    roasterId: values.roasterId ? Number(values.roasterId) : null,
    origin: blankToNull(values.origin),
    region: blankToNull(values.region),
    farm: blankToNull(values.farm),
    variety: blankToNull(values.variety),
    altitudeMinMeters: optionalInteger(values.altitudeMinMeters),
    altitudeMaxMeters: optionalInteger(values.altitudeMaxMeters),
    process: blankToNull(values.process),
    roastLevel: values.roastLevel || null,
    notes: blankToNull(values.notes),
  }
}

function formatRoastDate(value: string | Date | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
