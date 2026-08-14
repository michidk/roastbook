import { isCurrency } from '@/lib/app-settings'
import type { BeanType, RoastLevel } from '@/lib/constants'
import { blankToNull, blankToUndefined } from '@/lib/form-value-normalization'

export type BeanFormValues = {
  readonly name: string
  readonly type: BeanType | ''
  readonly roasterId: string
  readonly weight: string
  readonly price: string
  readonly priceCurrency: string
  readonly shopUrl: string
  readonly origin: string
  readonly region: string
  readonly farm: string
  readonly variety: string
  readonly process: string
  readonly roastLevel: RoastLevel | ''
  readonly roastDate: string
  readonly notes: string
}

type BeanFormValueSource = {
  readonly name: string | null
  readonly type: BeanType | null
  readonly roasterId: number | null
  readonly weight: string | null
  readonly price: string | null
  readonly priceCurrency: string | null
  readonly shopUrl: string | null
  readonly origin: string | null
  readonly region: string | null
  readonly farm: string | null
  readonly variety: string | null
  readonly process: string | null
  readonly roastLevel: RoastLevel | null
  readonly roastDate: string | Date | null
  readonly notes: string | null
}

export function createEmptyBeanFormValues(initialName = ''): BeanFormValues {
  return {
    name: initialName,
    type: '',
    roasterId: '',
    weight: '',
    price: '',
    priceCurrency: 'EUR',
    shopUrl: '',
    origin: '',
    region: '',
    farm: '',
    variety: '',
    process: '',
    roastLevel: '',
    roastDate: '',
    notes: '',
  }
}

export function toBeanFormValues(bean: BeanFormValueSource): BeanFormValues {
  return {
    name: bean.name ?? '',
    type: bean.type ?? '',
    roasterId: bean.roasterId ? String(bean.roasterId) : '',
    weight: bean.weight ?? '',
    price: bean.price ?? '',
    priceCurrency: bean.priceCurrency ?? 'EUR',
    shopUrl: bean.shopUrl ?? '',
    origin: bean.origin ?? '',
    region: bean.region ?? '',
    farm: bean.farm ?? '',
    variety: bean.variety ?? '',
    process: bean.process ?? '',
    roastLevel: bean.roastLevel ?? '',
    roastDate: formatRoastDate(bean.roastDate),
    notes: bean.notes ?? '',
  }
}

function optionalDate(value: string): Date | undefined {
  return value ? new Date(value) : undefined
}

export function beanCreatePayload(values: BeanFormValues) {
  return {
    name: values.name,
    type: values.type || undefined,
    roasterId: values.roasterId ? Number(values.roasterId) : undefined,
    weight: blankToUndefined(values.weight),
    price: blankToUndefined(values.price),
    priceCurrency: isCurrency(values.priceCurrency)
      ? values.priceCurrency
      : undefined,
    shopUrl: blankToUndefined(values.shopUrl),
    origin: blankToUndefined(values.origin),
    region: blankToUndefined(values.region),
    farm: blankToUndefined(values.farm),
    variety: blankToUndefined(values.variety),
    process: blankToUndefined(values.process),
    roastLevel: values.roastLevel || undefined,
    roastDate: optionalDate(values.roastDate),
    notes: blankToUndefined(values.notes),
  }
}

export function beanUpdatePayload(id: number, values: BeanFormValues) {
  return {
    id,
    name: values.name,
    type: values.type || null,
    roasterId: values.roasterId ? Number(values.roasterId) : null,
    weight: blankToNull(values.weight),
    price: blankToNull(values.price),
    priceCurrency: isCurrency(values.priceCurrency)
      ? values.priceCurrency
      : null,
    shopUrl: blankToNull(values.shopUrl),
    origin: blankToNull(values.origin),
    region: blankToNull(values.region),
    farm: blankToNull(values.farm),
    variety: blankToNull(values.variety),
    process: blankToNull(values.process),
    roastLevel: values.roastLevel || null,
    roastDate: optionalDate(values.roastDate) ?? null,
    notes: blankToNull(values.notes),
  }
}

function formatRoastDate(value: string | Date | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
