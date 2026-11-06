export function beanPurchaseKey(bean: {
  readonly id: number
  readonly purchaseId?: number | null
}) {
  return bean.purchaseId == null ? `bean:${bean.id}` : String(bean.purchaseId)
}
