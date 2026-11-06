import { z } from 'zod'
import {
  hasOnlyShotParameterKeys,
  normalizeShotParameterKeys,
} from '@/lib/brewing-methods'
import {
  nameSchema,
  notesSchema,
  openCoffeeIdSchema,
  positiveIdSchema,
} from '@/lib/server-validation'

class BrewingMethodInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrewingMethodInputError'
  }
}

const brewingMethodWriteSchema = z.object({
  name: nameSchema,
  description: notesSchema.nullable(),
  enabledParameters: z.array(z.string().max(100)).max(50),
  timerEnabled: z.boolean(),
  drinkTypeIds: z.array(positiveIdSchema).max(100).default([]),
  // Omitted on update keeps the stored link.
  brewMethodId: openCoffeeIdSchema.nullable().optional(),
})

const brewingMethodUpdateSchema = brewingMethodWriteSchema.extend({
  id: positiveIdSchema,
})

function normalizeBrewingMethodWrite(
  data: z.infer<typeof brewingMethodWriteSchema>,
) {
  if (!hasOnlyShotParameterKeys(data.enabledParameters)) {
    throw new BrewingMethodInputError('Choose only supported shot parameters')
  }
  if (
    data.timerEnabled &&
    !data.enabledParameters.includes('shotTimeSeconds')
  ) {
    throw new BrewingMethodInputError(
      'Enable the Brew time field before enabling the timer',
    )
  }
  return {
    name: data.name,
    description: data.description?.trim() || null,
    enabledParameters: [...normalizeShotParameterKeys(data.enabledParameters)],
    timerEnabled: data.timerEnabled,
    drinkTypeIds: [...new Set(data.drinkTypeIds)],
    brewMethodId: data.brewMethodId,
  }
}

const brewingMethodListSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
  query: z.string().trim().max(200).default(''),
})

export {
  BrewingMethodInputError,
  brewingMethodListSchema,
  brewingMethodUpdateSchema,
  brewingMethodWriteSchema,
  normalizeBrewingMethodWrite,
}
