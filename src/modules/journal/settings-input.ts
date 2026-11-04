import { z } from 'zod'
import {
  type Currency,
  type DateFormat,
  isCurrency,
  isDateFormat,
  isNumberFormat,
  isTimeZone,
  type NumberFormat,
} from '@/lib/app-settings'
import { type CollectionView, isCollectionView } from '@/lib/collection-view'
import {
  TASTE_PROFILE_FIELDS,
  type TasteProfileField,
} from '@/lib/taste-profile'

export const defaultMapLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    label: z.string().trim().min(1).max(500),
  })
  .nullable()

export function currencySchema(value: unknown): Currency {
  if (!isCurrency(value)) throw new Error('Choose a supported currency')
  return value
}

export function dateFormatSchema(value: unknown): DateFormat {
  if (!isDateFormat(value)) throw new Error('Choose a supported date format')
  return value
}

export function numberFormatSchema(value: unknown): NumberFormat {
  if (!isNumberFormat(value))
    throw new Error('Choose a supported number format')
  return value
}

export function timeZoneSchema(value: unknown): string {
  if (!isTimeZone(value)) throw new Error('Enter a valid IANA time zone')
  return value
}

export function listViewSchema(value: unknown): CollectionView {
  if (!isCollectionView(value)) throw new Error('Choose a supported list view')
  return value
}

// Normalizes to the canonical field order and silently drops anything the
// current build does not know about, so a stored value from another version
// never breaks the settings page.
export function tasteProfileFieldsSchema(value: unknown): TasteProfileField[] {
  const fields = z.array(z.string()).max(64).parse(value)
  return TASTE_PROFILE_FIELDS.filter((field) => fields.includes(field))
}
