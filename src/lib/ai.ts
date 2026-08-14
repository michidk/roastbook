import { chat } from '@tanstack/ai'
import {
  createOpenaiChat,
  OPENAI_CHAT_MODELS,
  type OpenAIChatModel,
} from '@tanstack/ai-openai'
import { webSearchTool } from '@tanstack/ai-openai/tools'
import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  AUTO_STOP_MODE_VALUES,
  BEAN_TYPE_VALUES,
  PROCESS_METHOD_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'
import { getServerEnv } from '@/lib/env.server'
import {
  buildStructuredResearchPrompt,
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
    visionModel: resolveModel(environment.OPENAI_VISION_MODEL, 'gpt-4o'),
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
      'All flavor descriptions, tasting notes, flavor profiles, cupping scores, SCA scores, and quality descriptors. Prefix flavor notes with "Tasting notes:".',
    jsonType: 'string',
    schema: z.string().trim().min(1).max(10_000),
    examples: [
      'Tasting notes: jasmine, bergamot, and peach.',
      'Tasting notes: dark chocolate and hazelnut. SCA score: 87.',
    ],
  },
})

export type ExtractedBeanInfo = StructuredResearchResult<
  typeof BEAN_INFO_FIELDS
>

function beanInfoPrompt(task: string, evidenceRule: string): string {
  return buildStructuredResearchPrompt({
    role: 'You are a coffee expert assistant',
    task,
    fields: BEAN_INFO_FIELDS,
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
  return Boolean(getServerEnv().OPENAI_API_KEY)
})

export const isResearchEnabled = createServerOnlyFn((): boolean => {
  return Boolean(getServerEnv().OPENAI_API_KEY)
})

const aiDecimal = z
  .union([
    z.number().finite().nonnegative(),
    z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d+)?$/),
  ])
  .transform(String)

const MACHINE_SETTINGS_FIELDS = defineStructuredResearchFields({
  brewPressureOpvBar: {
    description: 'The documented brew pressure or factory OPV setting in bar.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
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
    schema: aiDecimal,
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
    description: 'The documented steam pressure in bar.',
    jsonType: 'number',
    format: 'non-negative decimal number without a unit',
    schema: aiDecimal,
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

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 45_000)

  try {
    const content = await chat({
      adapter: createAdapter(config.visionModel, config),
      systemPrompts: [systemPrompt],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'data',
                value: imageBase64,
                mimeType,
              },
            },
            {
              type: 'text',
              content: 'Extract the coffee bean information from this image.',
            },
          ],
        },
      ],
      abortController,
      stream: false,
    })

    return content
      ? parseStructuredResearchResult(content, BEAN_INFO_FIELDS)
      : {}
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

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 60_000)

  try {
    const content = await chat({
      adapter: createAdapter(config.researchModel, config),
      systemPrompts: [systemPrompt],
      messages: [
        {
          role: 'user',
          content: `Research this ${subject}: "${searchQuery}"`,
        },
      ],
      tools: [webSearchTool({ type: 'web_search' })],
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
    logLabel: 'bean',
    logContext: { beanName, roasterName: roasterName ?? null },
  })
}

export const researchBeanFromWeb = createServerOnlyFn(researchBeanFromWebImpl)

async function researchRoasterFromWebImpl(
  roasterName: string,
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
    logLabel: 'roaster',
    logContext: { roasterName },
  })
}

export const researchRoasterFromWeb = createServerOnlyFn(
  researchRoasterFromWebImpl,
)

async function researchMachineSettingsFromWebImpl(
  name: string,
  brand: string,
  model: string,
): Promise<ExtractedMachineSettings> {
  const searchQuery = `"${brand} ${model}" "${name}" manual specifications pre-infusion volumetric steam pressure`

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
      'Omit model-dependent and user-configured values unless a factory default is explicitly documented.',
    ],
    logLabel: 'machine-settings',
    logContext: {
      name,
      brand,
      model,
    },
  })
}

export const researchMachineSettingsFromWeb = createServerOnlyFn(
  researchMachineSettingsFromWebImpl,
)
