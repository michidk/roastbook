import type { BeanType, RoastLevel } from "@/lib/constants"

export type BeanFormValues = {
  readonly name: string
  readonly type: BeanType | ""
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
  readonly roastLevel: RoastLevel | ""
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

export function createEmptyBeanFormValues(initialName = ""): BeanFormValues {
  return {
    name: initialName,
    type: "",
    roasterId: "",
    weight: "",
    price: "",
    priceCurrency: "EUR",
    shopUrl: "",
    origin: "",
    region: "",
    farm: "",
    variety: "",
    process: "",
    roastLevel: "",
    roastDate: "",
    notes: "",
  }
}

export function toBeanFormValues(bean: BeanFormValueSource): BeanFormValues {
  return {
    name: bean.name ?? "",
    type: bean.type ?? "",
    roasterId: bean.roasterId ? String(bean.roasterId) : "",
    weight: bean.weight ?? "",
    price: bean.price ?? "",
    priceCurrency: bean.priceCurrency ?? "EUR",
    shopUrl: bean.shopUrl ?? "",
    origin: bean.origin ?? "",
    region: bean.region ?? "",
    farm: bean.farm ?? "",
    variety: bean.variety ?? "",
    process: bean.process ?? "",
    roastLevel: bean.roastLevel ?? "",
    roastDate: formatRoastDate(bean.roastDate),
    notes: bean.notes ?? "",
  }
}

function formatRoastDate(value: string | Date | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}
