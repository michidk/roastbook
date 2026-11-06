import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { withResourceLimits } from '@/journal/domain/resource-limits'
import {
  altitudeSchema,
  beanTypeSchema,
  roastLevelSchema,
} from '@/journal/input/beans'
import { GEAR_TYPE_VALUES } from '@/lib/domain-contracts'
import { prepareAiImages } from '@/lib/server/ai-images.server'
import {
  extractBeanInfoFromImages,
  isResearchEnabled,
  isVisionEnabled,
  researchBeanFromWeb,
  researchMachineFromWeb,
  researchRoasterFromWeb,
} from '@/lib/server/ai-operations.server'
import {
  aiImageInputsSchema,
  nameSchema,
  notesSchema,
  shortTextSchema,
} from '@/lib/server-validation'
import type {
  ExtractedBeanInfo,
  ExtractedMachineResearch,
  ExtractedRoasterInfo,
} from '@/modules/ai/read-models'

/** AI research and label reading always run on the server, never offline or in the demo. */

const extractBeanInfoSchema = z.object({
  images: aiImageInputsSchema,
})

const researchBeanInfoSchema = z.object({
  beanName: nameSchema,
  roasterName: nameSchema.optional(),
  knownContext: z
    .object({
      type: beanTypeSchema.optional(),
      isDecaf: z.boolean().optional(),
      origin: shortTextSchema.optional(),
      region: shortTextSchema.optional(),
      farm: shortTextSchema.optional(),
      variety: shortTextSchema.optional(),
      altitudeMinMeters: altitudeSchema.optional(),
      altitudeMaxMeters: altitudeSchema.optional(),
      process: shortTextSchema.optional(),
      roastLevel: roastLevelSchema.optional(),
      roastDate: shortTextSchema.optional(),
      shopUrl: z.string().trim().max(2_048).optional(),
      notes: notesSchema.optional(),
    })
    .optional(),
})

export const checkVisionEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { enabled: await isVisionEnabled() }
  },
)

export const extractBeanInfo = createServerFn({ method: 'POST' })
  .validator(extractBeanInfoSchema)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!(await isVisionEnabled())) {
      throw new Error('Connect your AI provider in Settings > AI')
    }
    return withResourceLimits('bean-image-extraction', async () => {
      const aiImages = await prepareAiImages(data.images)
      return extractBeanInfoFromImages(aiImages)
    })
  })

export const checkResearchEnabled = createServerFn({ method: 'GET' }).handler(
  async () => {
    return { enabled: await isResearchEnabled() }
  },
)

export const researchBeanInfo = createServerFn({ method: 'POST' })
  .validator(researchBeanInfoSchema)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!(await isResearchEnabled())) {
      throw new Error(
        'Connect a provider with Responses API web search in Settings > AI',
      )
    }

    console.info('[Bean research] request', {
      beanName: data.beanName,
      roasterName: data.roasterName ?? null,
    })

    return withResourceLimits('bean-web-research', () =>
      researchBeanFromWeb(data.beanName, data.roasterName, data.knownContext),
    )
  })

const researchMachineSettingsSchema = z.object({
  brand: nameSchema,
  model: nameSchema,
  knownContext: z
    .object({
      type: z.enum(GEAR_TYPE_VALUES).optional(),
      manualUrl: z.string().trim().max(2_048).optional(),
      productUrl: z.string().trim().max(2_048).optional(),
      notes: notesSchema.optional(),
    })
    .optional(),
})

export const checkGearResearchEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: await isResearchEnabled() }))

export const researchMachineSettings = createServerFn({ method: 'POST' })
  .validator(researchMachineSettingsSchema)
  .handler(async ({ data }): Promise<ExtractedMachineResearch> => {
    if (!(await isResearchEnabled())) {
      throw new Error(
        'Connect a provider with Responses API web search in Settings > AI',
      )
    }

    return withResourceLimits('machine-web-research', () =>
      researchMachineFromWeb(data.brand, data.model, data.knownContext),
    )
  })

const researchRoasterInfoSchema = z
  .object({
    name: z.string().trim().max(200),
    knownContext: z
      .object({
        location: shortTextSchema.optional(),
        country: shortTextSchema.optional(),
        website: z.string().trim().max(2_048).optional(),
        instagramHandle: z.string().trim().max(100).optional(),
        notes: notesSchema.optional(),
      })
      .optional(),
  })
  .refine((data) => data.name || data.knownContext?.website, {
    message: 'Enter a roaster name or website first',
  })

export const checkRoasterResearchEnabled = createServerFn({
  method: 'GET',
}).handler(async () => ({ enabled: await isResearchEnabled() }))

export const researchRoasterInfo = createServerFn({ method: 'POST' })
  .validator(researchRoasterInfoSchema)
  .handler(async ({ data }): Promise<ExtractedRoasterInfo> => {
    if (!(await isResearchEnabled())) {
      throw new Error(
        'Connect a provider with Responses API web search in Settings > AI',
      )
    }

    return withResourceLimits('roaster-web-research', () =>
      researchRoasterFromWeb(data.name, data.knownContext),
    )
  })
