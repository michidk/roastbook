import { chat, type ModelMessage } from '@tanstack/ai'
import { webSearchTool } from '@tanstack/ai-openai/tools'
import {
  createAiRequestLogMiddleware,
  startAiRequestLog,
} from '@/lib/server/ai-request-logs.server'
import {
  BEAN_INFO_FIELDS,
  MACHINE_RESEARCH_FIELDS,
  normalizeMachineResearchResult,
  ROASTER_INFO_FIELDS,
} from '@/lib/server/ai-research-fields.server'
import {
  createAiAdapter,
  getOpenAIConfig,
} from '@/lib/server/ai-runtime.server'
import {
  buildStructuredResearchPrompt,
  buildStructuredResearchSubjectPrompt,
  parseStructuredResearchResult,
  type StructuredResearchFields,
  type StructuredResearchResult,
} from '@/lib/structured-research'
import type {
  ExtractedBeanInfo,
  ExtractedMachineResearch,
  ExtractedRoasterInfo,
} from '@/modules/ai/read-models'

type StructuredWebResearchRequest<TFields extends StructuredResearchFields> = {
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

async function researchStructuredDataFromWeb<
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
  const systemPrompts = [
    buildStructuredResearchPrompt({ role, task, fields, evidenceRules }),
  ]
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
      adapter: createAiAdapter(config.researchModel, config),
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

export async function researchBeanFromWeb(
  beanName: string,
  roasterName?: string,
  knownContext?: Readonly<Record<string, unknown>>,
): Promise<ExtractedBeanInfo> {
  const searchQuery = roasterName
    ? `${roasterName} ${beanName} coffee beans`
    : `${beanName} coffee beans`
  return researchStructuredDataFromWeb({
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

export async function researchRoasterFromWeb(
  roasterName: string,
  knownContext?: Readonly<Record<string, unknown>>,
): Promise<ExtractedRoasterInfo> {
  return researchStructuredDataFromWeb({
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

export async function researchMachineFromWeb(
  brand: string,
  model: string,
  knownContext?: Readonly<Record<string, unknown>>,
): Promise<ExtractedMachineResearch> {
  const research = await researchStructuredDataFromWeb({
    subject: 'espresso machine',
    searchQuery: `"${brand} ${model}" exact model manual specifications portafilter heating pressure pre-infusion dosing steam`,
    role: 'You are a coffee equipment expert',
    task: "First verify the exact espresso machine identity, region, and model number. Then research every requested capability and factory default with targeted, model-specific searches. Use the machine's documented terminology and translate it to the requested fields only when the mapping is unambiguous. Return claim-level evidence for every property.",
    fields: MACHINE_RESEARCH_FIELDS,
    evidenceRules: [
      'Every returned specification or factory setting must have at least one matching evidence entry whose propertyKey is its exact nested path.',
      'Start with the manufacturer manual and support documentation, then use reputable technical reviews to fill documented gaps.',
      'Classify exact-model manuals and support documents as manual, official product/specification pages as manufacturer, reputable technical reviews as specialist, stores as retailer, and forums or owner posts as community.',
      'A claim requires manual, manufacturer, or reputable specialist evidence. Retailer and community pages may corroborate a claim but cannot be its only source.',
      'Search the exact model number together with relevant terms for each field, including pre-infusion, low-pressure extraction, volumetric dosing, shot programming, OPV, steam pressure, temperature settings, and flow control.',
      'Do not infer a value from a similar machine or a different model revision.',
      'Capabilities may be derived from clearly documented behavior: for example, automatic low-pressure extraction means pre-infusion is supported, and programmable volumetric shot buttons mean the auto-stop mode is volume.',
      'Numerical values must be explicitly documented for this model; convert compatible units when necessary and return only the requested unit.',
      'Never use the advertised maximum pump rating as brew pressure, an OPV setting, pre-infusion pressure, or steam pressure. A statement such as “15 bar pump” supports none of those fields.',
      'Steam pressure requires a documented steam-boiler or steam-circuit operating pressure. Omit it for thermocoil and thermoblock machines unless that exact operating pressure is documented.',
      'Omit model-dependent and user-configured values unless a factory default is explicitly documented. Never return an owner setting, recipe target, or observed brew value.',
      'When a source value is converted, preserve its original text and unit in rawValue and rawUnit.',
    ],
    knownContext,
    logLabel: 'machine',
    logContext: { brand, model },
  })

  return normalizeMachineResearchResult(research)
}
