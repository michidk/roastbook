import { chat, type ModelMessage } from '@tanstack/ai'
import {
  createOpenaiChat,
  OPENAI_CHAT_MODELS,
  type OpenAIChatModel,
} from '@tanstack/ai-openai'
import { webSearchTool } from '@tanstack/ai-openai/tools'
import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  AUTO_STOP_MODE_VALUES,
  BEAN_TYPE_VALUES,
  PROCESS_METHOD_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'
import { getServerEnv } from '@/lib/env.server'
import {
  completeAiRequestLog,
  createAiRequestLogMiddleware,
  failAiRequestLog,
  startAiRequestLog,
} from '@/lib/server/ai-request-logs.server'
import {
  buildShotRecommendationPrompt,
  type ShotRecommendation,
  type ShotRecommendationContext,
  shotRecommendationSchema,
} from '@/lib/shot-recommendation'
import {
  buildStructuredResearchPrompt,
  buildStructuredResearchSubjectPrompt,
  defineStructuredResearchFields,
  parseStructuredResearchResult,
  type StructuredResearchFields,
  type StructuredResearchResult,
} from '@/lib/structured-research'

function isOpenAIChatModel(model: string): model is OpenAIChatModel {
  return (OPENAI_CHAT_MODELS as ReadonlyArray<string>).includes(model)
}

function resolveModel(
  envValue: string | undefined,
  fallback: OpenAIChatModel,
): OpenAIChatModel {
  return envValue && isOpenAIChatModel(envValue) ? envValue : fallback
}

function getOpenAIConfig() {
  const environment = getServerEnv()
  return {
    apiKey: environment.OPENAI_API_KEY,
    baseURL: environment.OPENAI_BASE_URL,
    visionModel: environment.OPENAI_VISION_MODEL,
    researchModel: resolveModel(environment.OPENAI_RESEARCH_MODEL, 'gpt-4o'),
  }
}

const aiText = z.string().trim().min(1).max(500)

const ROASTER_INFO_FIELDS = defineStructuredResearchFields({
  name: {
    description: 'The official trading name of the coffee roaster.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Square Mile Coffee Roasters', 'Onyx Coffee Lab'],
  },
  location: {
    description:
      'The roaster headquarters or primary roasting location as city and, when useful, state or region. Do not include the country.',
    jsonType: 'string',
    schema: aiText,
    examples: ['London', 'Rogers, Arkansas'],
  },
  country: {
    description: 'The country of the headquarters or primary roastery.',
    jsonType: 'string',
    schema: aiText,
    examples: ['United Kingdom', 'United States'],
  },
  website: {
    description: 'The canonical HTTPS URL of the roaster’s official website.',
    jsonType: 'string',
    format: 'absolute HTTPS URL',
    schema: z.url().max(2_048),
    examples: ['https://squaremilecoffee.com/'],
  },
  instagramHandle: {
    description:
      'The official Instagram username only, without an @ sign or URL.',
    jsonType: 'string',
    format: 'Instagram username without @',
    schema: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^@?[A-Za-z0-9._]+$/)
      .transform((value) => value.replace(/^@/, '')),
    examples: ['squaremilecoffee', 'onyxcoffeelab'],
  },
  notes: {
    description:
      'A concise factual overview of the roaster, such as founding context, sourcing approach, or coffee focus. Avoid marketing claims and contact details.',
    jsonType: 'string',
    schema: z.string().trim().min(1).max(10_000),
    examples: [
      'Independent specialty coffee roaster founded in London in 2008, focused on seasonal single-origin coffees and blends.',
    ],
  },
})

export type ExtractedRoasterInfo = StructuredResearchResult<
  typeof ROASTER_INFO_FIELDS
>

const BEAN_INFO_FIELDS = defineStructuredResearchFields({
  name: {
    description: 'The coffee or blend name.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Ethiopia Yirgacheffe', 'House Espresso Blend'],
  },
  roaster: {
    description: 'The roasting company name.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Square Mile Coffee Roasters', 'Onyx Coffee Lab'],
  },
  type: {
    description: 'The intended brewing category for the coffee.',
    jsonType: 'string',
    schema: z.enum(BEAN_TYPE_VALUES),
    options: BEAN_TYPE_VALUES,
    examples: ['espresso', 'filter'],
  },
  origin: {
    description: 'The country of origin.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Ethiopia', 'Colombia'],
  },
  region: {
    description: 'The specific region within the country.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Yirgacheffe', 'Huila'],
  },
  farm: {
    description: 'The farm, cooperative, washing station, or producer name.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Konga Cooperative', 'Finca El Paraiso'],
  },
  variety: {
    description: 'The coffee variety or varieties.',
    jsonType: 'string',
    schema: aiText,
    examples: ['Bourbon', 'Gesha, Caturra'],
  },
  process: {
    description: 'The coffee processing method.',
    jsonType: 'string',
    schema: z.enum(PROCESS_METHOD_VALUES),
    options: PROCESS_METHOD_VALUES,
    examples: ['washed', 'carbonic_maceration'],
  },
  roastLevel: {
    description: 'The described roast level.',
    jsonType: 'string',
    schema: z.enum(ROAST_LEVEL_VALUES),
    options: ROAST_LEVEL_VALUES,
    examples: ['light', 'medium_dark'],
  },
  roastDate: {
    description: 'The roast date, when a specific date is available.',
    jsonType: 'string',
    format: 'YYYY-MM-DD',
    schema: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    examples: ['2026-08-14', '2025-12-03'],
  },
  notes: {
    description:
      'All flavor descriptions, tasting notes, flavor profiles, cupping scores, SCA scores, quality descriptors, and clearly stated label details that do not fit another field, such as a named or specialized processing technique. Prefix flavor notes with "Tasting notes:".',
    jsonType: 'string',
    schema: z.string().trim().min(1).max(10_000),
    examples: [
      'Tasting notes: jasmine, bergamot, and peach.',
      'Tasting notes: dark chocolate and hazelnut. SCA score: 87.',
    ],
  },
})

const BEAN_IMAGE_INFO_FIELDS = defineStructuredResearchFields({
  ...BEAN_INFO_FIELDS,
  roasterLocation: {
    description:
      'The roaster city and, when useful, state or region as printed on the packaging. Do not include the country.',
    jsonType: 'string',
    schema: aiText,
    examples: ['London', 'Rogers, Arkansas'],
  },
  roasterCountry: {
    description: 'The roaster country as printed on the packaging.',
    jsonType: 'string',
    schema: aiText,
    examples: ['United Kingdom', 'United States'],
  },
  roasterWebsite: {
    description: 'The roaster website printed on the packaging.',
    jsonType: 'string',
    format: 'absolute HTTPS URL',
    schema: z.url().max(2_048),
    examples: ['https://squaremilecoffee.com/'],
  },
  roasterInstagramHandle: {
    description:
      'The roaster Instagram username printed on the packaging, without an @ sign or URL.',
    jsonType: 'string',
    format: 'Instagram username without @',
    schema: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^@?[A-Za-z0-9._]+$/)
      .transform((value) => value.replace(/^@/, '')),
    examples: ['squaremilecoffee', 'onyxcoffeelab'],
  },
})

export type ExtractedBeanInfo = StructuredResearchResult<
  typeof BEAN_IMAGE_INFO_FIELDS
>

function beanInfoPrompt(task: string, evidenceRule: string): string {
  return buildStructuredResearchPrompt({
    role: 'You are a coffee expert assistant',
    task,
    fields: BEAN_IMAGE_INFO_FIELDS,
    evidenceRules: [evidenceRule],
  })
}

function createAdapter(
  model: OpenAIChatModel,
  config: ReturnType<typeof getOpenAIConfig>,
) {
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  return createOpenaiChat(model, config.apiKey, { baseURL: config.baseURL })
}

export const isVisionEnabled = createServerOnlyFn((): boolean => {
  if (DEMO_MODE) return false
  return Boolean(getServerEnv().OPENAI_API_KEY)
})

export const isResearchEnabled = createServerOnlyFn((): boolean => {
  if (DEMO_MODE) return false
  return Boolean(getServerEnv().OPENAI_API_KEY)
})

async function recommendShotFromHistoryImpl(
  context: ShotRecommendationContext,
): Promise<ShotRecommendation> {
  const config = getOpenAIConfig()
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const systemPrompts = [
    'You are a precise coffee dialing assistant. Base every claim on the supplied filtered brew evidence and return the requested structured recommendation.',
  ]
  const messages: Array<ModelMessage> = [
    { role: 'user', content: buildShotRecommendationPrompt(context) },
  ]
  const requestLogId = await startAiRequestLog({
    requestType: 'shot-recommendation',
    model: config.researchModel,
    requestPayload: {
      model: config.researchModel,
      systemPrompts,
      messages,
      outputSchema: 'shotRecommendationSchema',
      stream: false,
    },
  })
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 45_000)

  try {
    return await chat({
      adapter: createAdapter(config.researchModel, config),
      systemPrompts,
      messages,
      outputSchema: shotRecommendationSchema,
      abortController,
      middleware: [
        createAiRequestLogMiddleware(requestLogId, config.researchModel),
      ],
      stream: false,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export const recommendShotFromHistory = createServerOnlyFn(
  recommendShotFromHistoryImpl,
)

const aiDecimal = z
  .union([
    z.number().finite().nonnegative(),
    z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d+)?$/),
  ])
  .transform(String)

const aiDecimalAtMost = (maximum: number) =>
  aiDecimal.refine((value) => Number(value) <= maximum)

export const MACHINE_SETTINGS_FIELDS = defineStructuredResearchFields({
  brewPressureOpvBar: {
    description:
      'The documented operating brew pressure or factory OPV setting in bar. This is not the pump’s advertised maximum pressure.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimalAtMost(12),
    examples: [9, 10.5],
  },
  supportsPreinfusion: {
    description: 'Whether the machine supports pre-infusion.',
    jsonType: 'boolean',
    schema: z.boolean(),
    examples: [true, false],
  },
  defaultPreinfusionEnabled: {
    description:
      'Whether pre-infusion happens automatically during the standard factory shot workflow. Return true when normal shots begin with pre-infusion without the user enabling it first.',
    jsonType: 'boolean',
    schema: z.boolean(),
    examples: [true, false],
  },
  defaultPreinfusionTimeSeconds: {
    description: 'The factory default pre-infusion duration in seconds.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
    examples: [5, 8.5],
  },
  defaultPreinfusionPressureBar: {
    description: 'The factory default pre-infusion pressure in bar.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimalAtMost(9),
    examples: [2, 3.5],
  },
  defaultFlowLimitMlPerSecond: {
    description: 'The factory default flow limit in milliliters per second.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
    examples: [2, 2.5],
  },
  temperatureOffsetCelsius: {
    description:
      'The documented factory temperature offset in degrees Celsius.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
    examples: [0, 2],
  },
  volumetricShotVolumeMl: {
    description:
      'The factory default single-shot volumetric dose in milliliters. When both single- and double-shot presets are documented, use the single-shot preset.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
    examples: [30, 60],
  },
  autoStopMode: {
    description:
      'The mechanism used to stop a shot. Map programmable volumetric dosing to "volume", an integrated scale target to "weight", a timer target to "time", and a required user stop to "manual".',
    jsonType: 'string',
    schema: z.enum(AUTO_STOP_MODE_VALUES),
    options: AUTO_STOP_MODE_VALUES,
    examples: ['volume', 'weight'],
  },
  steamTemperatureCelsius: {
    description: 'The factory default steam temperature in degrees Celsius.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
    examples: [130, 135.5],
  },
  steamPressureBar: {
    description:
      'The documented steam-boiler or steam-circuit operating pressure in bar. This is not pump pressure.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimalAtMost(3.5),
    examples: [1.2, 2],
  },
})

export type ExtractedMachineSettings = StructuredResearchResult<
  typeof MACHINE_SETTINGS_FIELDS
>

async function extractBeanInfoFromImageImpl(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<ExtractedBeanInfo> {
  const config = getOpenAIConfig()
  if (!config.apiKey) {
    return {}
  }

  const systemPrompt = beanInfoPrompt(
    'Extract coffee bean information from product images (bags, labels, packaging).',
    'Only include fields where you can clearly read the information. Do not guess.',
  )
  const requestLogId = await startAiRequestLog({
    requestType: 'bean-image-extraction',
    model: config.visionModel,
    requestPayload: {
      model: config.visionModel,
      mimeType,
      imageBytes: Buffer.byteLength(imageBase64, 'base64'),
      stream: false,
    },
  })

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 45_000)
  const startedAt = Date.now()

  try {
    const baseURL = (config.baseURL ?? 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    )
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.visionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extract the coffee bean information from this image.',
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
      signal: abortController.signal,
    })
    const responseBody: unknown = await response.json()
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'AI service authentication failed. Update the configured API key.',
        )
      }
      const providerError = z
        .object({ error: z.object({ message: z.string() }) })
        .safeParse(responseBody)
      throw new Error(
        providerError.success
          ? providerError.data.error.message
          : `Vision provider request failed (${response.status})`,
      )
    }
    const result = z
      .object({
        choices: z.array(
          z.object({ message: z.object({ content: z.string().nullable() }) }),
        ),
        usage: z
          .object({
            prompt_tokens: z.number().int().nonnegative(),
            completion_tokens: z.number().int().nonnegative(),
            total_tokens: z.number().int().nonnegative(),
            prompt_tokens_details: z
              .object({
                cached_tokens: z.number().int().nonnegative().optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .parse(responseBody)
    const content = result.choices[0]?.message.content ?? ''

    const extracted = content
      ? parseStructuredResearchResult(content, BEAN_IMAGE_INFO_FIELDS)
      : {}
    const usage = result.usage
      ? {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
          ...(result.usage.prompt_tokens_details?.cached_tokens
            ? {
                promptTokensDetails: {
                  cachedTokens:
                    result.usage.prompt_tokens_details.cached_tokens,
                },
              }
            : undefined),
        }
      : undefined
    await completeAiRequestLog({
      logId: requestLogId,
      model: config.visionModel,
      responsePayload: { content, fields: Object.keys(extracted) },
      usage,
      durationMs: Date.now() - startedAt,
    })
    console.info('[Bean image extraction] completed', {
      model: config.visionModel,
      responseCharacters: content.length,
      fields: Object.keys(extracted),
    })
    return extracted
  } catch (error) {
    await failAiRequestLog({
      logId: requestLogId,
      model: config.visionModel,
      error,
      durationMs: Date.now() - startedAt,
    })
    console.error('[Bean image extraction] failed', {
      model: config.visionModel,
      error,
    })
    if (abortController.signal.aborted) {
      throw new Error('Image analysis timed out. Please try again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export const extractBeanInfoFromImage = createServerOnlyFn(
  extractBeanInfoFromImageImpl,
)

export type StructuredWebResearchRequest<
  TFields extends StructuredResearchFields,
> = {
  readonly subject: string
  readonly searchQuery: string
  readonly role: string
  readonly task: string
  readonly fields: TFields
  readonly evidenceRules: readonly string[]
  readonly knownContext?: Readonly<Record<string, unknown>>
  readonly logLabel: string
  readonly logContext?: Readonly<Record<string, unknown>>
}

async function researchStructuredDataFromWebImpl<
  TFields extends StructuredResearchFields,
>({
  subject,
  searchQuery,
  role,
  task,
  fields,
  evidenceRules,
  knownContext,
  logLabel,
  logContext,
}: StructuredWebResearchRequest<TFields>): Promise<
  StructuredResearchResult<TFields>
> {
  const config = getOpenAIConfig()
  if (!config.apiKey) return {}

  console.info(`[AI research:${logLabel}] search query`, {
    ...logContext,
    searchQuery,
    model: config.researchModel,
  })

  const systemPrompt = buildStructuredResearchPrompt({
    role,
    task,
    fields,
    evidenceRules,
  })
  const systemPrompts = [systemPrompt]
  const messages: Array<ModelMessage> = [
    {
      role: 'user',
      content: buildStructuredResearchSubjectPrompt({
        subject,
        searchQuery,
        knownContext,
      }),
    },
  ]
  const requestLogId = await startAiRequestLog({
    requestType: `${logLabel}-web-research`,
    model: config.researchModel,
    requestPayload: {
      model: config.researchModel,
      systemPrompts,
      messages,
      tools: [{ type: 'web_search' }],
      stream: false,
    },
  })

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 60_000)

  try {
    const content = await chat({
      adapter: createAdapter(config.researchModel, config),
      systemPrompts,
      messages,
      tools: [webSearchTool({ type: 'web_search' })],
      middleware: [
        createAiRequestLogMiddleware(requestLogId, config.researchModel),
      ],
      abortController,
      stream: false,
    })

    console.info(`[AI research:${logLabel}] complete`, {
      hasContent: content.length > 0,
      preview: content.slice(0, 300),
    })

    return content ? parseStructuredResearchResult(content, fields) : {}
  } finally {
    clearTimeout(timeout)
  }
}

async function researchBeanFromWebImpl(
  beanName: string,
  roasterName?: string,
  knownContext?: Readonly<Record<string, unknown>>,
): Promise<ExtractedBeanInfo> {
  const searchQuery = roasterName
    ? `${roasterName} ${beanName} coffee beans`
    : `${beanName} coffee beans`

  return researchStructuredDataFromWebImpl({
    subject: 'coffee',
    searchQuery,
    role: 'You are a coffee expert assistant',
    task: 'Search the web for information about the specified coffee bean.',
    fields: BEAN_INFO_FIELDS,
    evidenceRules: [
      'Use reliable coffee roaster websites, review sites, or specialty coffee databases.',
      'Prefer the roaster or producer as the primary source when available.',
    ],
    knownContext,
    logLabel: 'bean',
    logContext: { beanName, roasterName: roasterName ?? null },
  })
}

export const researchBeanFromWeb = createServerOnlyFn(researchBeanFromWebImpl)

async function researchRoasterFromWebImpl(
  roasterName: string,
  knownContext?: Readonly<Record<string, unknown>>,
): Promise<ExtractedRoasterInfo> {
  return researchStructuredDataFromWebImpl({
    subject: 'coffee roaster',
    searchQuery: `"${roasterName}" coffee roaster official website Instagram location`,
    role: 'You are a specialty coffee research assistant',
    task: 'Identify the specified coffee roaster and research its official company details.',
    fields: ROASTER_INFO_FIELDS,
    evidenceRules: [
      'Prefer the roaster’s official website, About page, and official Instagram profile.',
      'Use reputable specialty coffee sources only to fill gaps left by official sources.',
      'Verify that every result belongs to the exact roaster and not a similarly named café or coffee company.',
      'Use the headquarters or primary roasting location, not a retailer, stockist, or temporary event location.',
    ],
    knownContext,
    logLabel: 'roaster',
    logContext: { roasterName },
  })
}

export const researchRoasterFromWeb = createServerOnlyFn(
  researchRoasterFromWebImpl,
)

async function researchMachineSettingsFromWebImpl(
  brand: string,
  model: string,
  knownContext?: Readonly<Record<string, unknown>>,
): Promise<ExtractedMachineSettings> {
  const searchQuery = `"${brand} ${model}" manual specifications pre-infusion volumetric steam pressure`

  return researchStructuredDataFromWebImpl({
    subject: 'espresso machine',
    searchQuery,
    role: 'You are a coffee equipment expert',
    task: "First verify the exact espresso machine identity and model number. Then research every requested capability and factory default with targeted, model-specific searches. Use the machine's documented terminology and translate it to the requested fields when the mapping is clear.",
    fields: MACHINE_SETTINGS_FIELDS,
    evidenceRules: [
      'Use manufacturer documentation, manuals, product pages, or reputable specialist sources.',
      'Start with the manufacturer manual and support documentation, then use reputable technical reviews to fill documented gaps.',
      'Search the exact model number together with relevant terms for each field, including pre-infusion, low-pressure extraction, volumetric dosing, shot programming, OPV, steam pressure, temperature settings, and flow control.',
      'Do not infer a value from a similar machine or a different model revision.',
      'Capabilities may be derived from clearly documented behavior: for example, automatic low-pressure extraction means pre-infusion is supported, and programmable volumetric shot buttons mean the auto-stop mode is volume.',
      'Numerical values must be explicitly documented for this model; convert compatible units when necessary and return only the requested unit.',
      'Never use the advertised maximum pump rating as brew pressure, an OPV setting, pre-infusion pressure, or steam pressure. A statement such as “15 bar pump” supports none of those fields.',
      'Steam pressure requires a documented steam-boiler or steam-circuit operating pressure. Omit it for thermocoil and thermoblock machines unless that exact operating pressure is documented.',
      'Omit model-dependent and user-configured values unless a factory default is explicitly documented.',
    ],
    knownContext,
    logLabel: 'machine-settings',
    logContext: { brand, model },
  })
}

export const researchMachineSettingsFromWeb = createServerOnlyFn(
  researchMachineSettingsFromWebImpl,
)
