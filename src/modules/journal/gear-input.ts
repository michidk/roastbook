import { z } from 'zod'
import { GEAR_TYPE_VALUES } from '@/lib/domain-contracts'
import {
  basketDetailsSchema,
  brewerDetailsSchema,
  espressoMachineDetailsSchema,
  espressoMachineSettingsSchema,
  gearPropertyEvidenceSchema,
  grinderDetailsSchema,
  kettleDetailsSchema,
  scaleDetailsSchema,
  tamperDetailsSchema,
  wdtDetailsSchema,
} from '@/lib/gear-property-schemas'
import {
  boundedDecimalStringSchema,
  currencySchema,
  nameSchema,
  notesSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

const nullableUrl = z.union([z.url().max(2_048), z.literal('')]).nullable()

const gearCreateSchema = z.object({
  brand: nameSchema,
  model: nameSchema,
  type: z.enum(GEAR_TYPE_VALUES),
  purchaseDate: z.date().nullable().optional(),
  purchasePrice: boundedDecimalStringSchema(999_999.99, 2)
    .nullable()
    .optional(),
  priceCurrency: currencySchema.nullable().optional(),
  manualUrl: nullableUrl.optional(),
  productUrl: nullableUrl.optional(),
  notes: notesSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
  espressoMachineDetails: espressoMachineDetailsSchema.nullable().optional(),
  ownerMachineSettings: espressoMachineSettingsSchema.nullable().optional(),
  factoryMachineSettings: espressoMachineSettingsSchema.nullable().optional(),
  grinderDetails: grinderDetailsSchema.nullable().optional(),
  brewerDetails: brewerDetailsSchema.nullable().optional(),
  kettleDetails: kettleDetailsSchema.nullable().optional(),
  scaleDetails: scaleDetailsSchema.nullable().optional(),
  tamperDetails: tamperDetailsSchema.nullable().optional(),
  wdtDetails: wdtDetailsSchema.nullable().optional(),
  basketDetails: basketDetailsSchema.nullable().optional(),
  propertyEvidence: z.array(gearPropertyEvidenceSchema).max(100).optional(),
})

const gearUpdateSchema = gearCreateSchema.partial().extend({
  id: positiveIdSchema,
  confirmTypeChange: z.boolean().optional(),
})

const gearListSchema = z.object({
  activePage: z.number().int().min(1).max(100_000).default(1),
  archivedPage: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
  sort: z.enum(['added', 'name', 'type']).default('added'),
  direction: z.enum(['asc', 'desc']).default('desc'),
})

export { gearCreateSchema, gearListSchema, gearUpdateSchema }
