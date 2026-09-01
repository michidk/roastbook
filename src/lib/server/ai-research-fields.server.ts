import { z } from 'zod'
import {
  AUTO_STOP_MODE_VALUES,
  BEAN_TYPE_VALUES,
  GEAR_PROPERTY_SOURCE_KIND_VALUES,
  MACHINE_FLOW_CONTROL_VALUES,
  MACHINE_HEATING_ARCHITECTURE_VALUES,
  MACHINE_PREINFUSION_CONTROL_VALUES,
  MACHINE_PRESSURE_CONTROL_VALUES,
  MACHINE_PUMP_TYPE_VALUES,
  MACHINE_STEAM_SYSTEM_VALUES,
  MACHINE_TEMPERATURE_CONTROL_VALUES,
  MACHINE_WATER_SOURCE_VALUES,
  PROCESS_METHOD_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'
import {
  buildStructuredResearchPrompt,
  defineStructuredResearchFields,
  parseStructuredResearchResult,
  type StructuredResearchResult,
} from '@/lib/structured-research'
import {
  type ExtractedMachineResearch,
  MACHINE_RESEARCH_PROPERTY_KEYS,
  type MachineResearchEvidence,
} from '@/modules/ai/read-models'

const aiText = z.string().trim().min(1).max(500)

export const ROASTER_INFO_FIELDS = defineStructuredResearchFields({
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

export const BEAN_INFO_FIELDS = defineStructuredResearchFields({
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

export const BEAN_IMAGE_INFO_FIELDS = defineStructuredResearchFields({
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

export function beanInfoPrompt(task: string, evidenceRule: string): string {
  return buildStructuredResearchPrompt({
    role: 'You are a coffee expert assistant',
    task,
    fields: BEAN_IMAGE_INFO_FIELDS,
    evidenceRules: [evidenceRule],
  })
}

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

const aiPositiveDecimal = aiDecimal.refine((value) => Number(value) > 0)
const aiPositiveDecimalAtMost = (maximum: number) =>
  aiPositiveDecimal.refine((value) => Number(value) <= maximum)
const aiSignedDecimal = z
  .union([
    z.number().finite(),
    z
      .string()
      .trim()
      .regex(/^-?\d+(?:\.\d+)?$/),
  ])
  .transform(String)
const aiSignedDecimalAtMost = (maximum: number) =>
  aiSignedDecimal.refine((value) => Math.abs(Number(value)) <= maximum)

function optionalResearchValue<TSchema extends z.ZodType>(schema: TSchema) {
  return schema.optional().catch(undefined)
}

function uniqueEnumSet<const TValues extends readonly string[]>(
  values: TValues,
) {
  return z
    .array(z.enum(values))
    .max(values.length)
    .refine(
      (items) => new Set(items).size === items.length,
      'Each value may appear only once',
    )
}

const machineSpecificationsResearchSchema = z.object({
  portafilterDiameterMm: optionalResearchValue(aiPositiveDecimalAtMost(999.99)),
  heatingArchitecture: optionalResearchValue(
    z.enum(MACHINE_HEATING_ARCHITECTURE_VALUES),
  ),
  temperatureControl: optionalResearchValue(
    z.enum(MACHINE_TEMPERATURE_CONTROL_VALUES),
  ),
  pressureControl: optionalResearchValue(
    z.enum(MACHINE_PRESSURE_CONTROL_VALUES),
  ),
  flowControl: optionalResearchValue(z.enum(MACHINE_FLOW_CONTROL_VALUES)),
  preinfusionControl: optionalResearchValue(
    z.enum(MACHINE_PREINFUSION_CONTROL_VALUES),
  ),
  shotStopModes: optionalResearchValue(uniqueEnumSet(AUTO_STOP_MODE_VALUES)),
  steamSystem: optionalResearchValue(z.enum(MACHINE_STEAM_SYSTEM_VALUES)),
  simultaneousBrewAndSteam: optionalResearchValue(z.boolean()),
  groupCount: optionalResearchValue(z.number().int().positive().max(100)),
  pumpType: optionalResearchValue(z.enum(MACHINE_PUMP_TYPE_VALUES)),
  waterSourceModes: optionalResearchValue(
    uniqueEnumSet(MACHINE_WATER_SOURCE_VALUES),
  ),
  brewPressureMinimumBar: optionalResearchValue(aiDecimalAtMost(12)),
  brewPressureMaximumBar: optionalResearchValue(aiDecimalAtMost(12)),
  brewTemperatureMinimumCelsius: optionalResearchValue(
    aiSignedDecimalAtMost(999.9),
  ),
  brewTemperatureMaximumCelsius: optionalResearchValue(
    aiSignedDecimalAtMost(999.9),
  ),
})

const machineFactorySettingsResearchSchema = z.object({
  brewPressureBar: optionalResearchValue(aiDecimalAtMost(12)),
  preinfusionEnabled: optionalResearchValue(z.boolean()),
  preinfusionTimeSeconds: optionalResearchValue(aiDecimal),
  preinfusionPressureBar: optionalResearchValue(aiDecimalAtMost(9)),
  flowLimitMlPerSecond: optionalResearchValue(aiDecimal),
  brewTemperatureOffsetCelsius: optionalResearchValue(
    aiSignedDecimalAtMost(999.9),
  ),
  programmedVolumeMl: optionalResearchValue(aiPositiveDecimal),
  defaultStopMode: optionalResearchValue(z.enum(AUTO_STOP_MODE_VALUES)),
  steamTemperatureCelsius: optionalResearchValue(aiPositiveDecimal),
  steamPressureBar: optionalResearchValue(aiDecimalAtMost(3.5)),
})

const machineResearchEvidenceSchema = z.object({
  propertyKey: z.enum(MACHINE_RESEARCH_PROPERTY_KEYS),
  sourceUrl: z
    .url()
    .max(2_048)
    .refine(
      (value) => value.startsWith('https://') || value.startsWith('http://'),
    ),
  sourceTitle: z.string().trim().min(1).max(500).optional(),
  sourceKind: z.enum(GEAR_PROPERTY_SOURCE_KIND_VALUES),
  rawValue: z.string().trim().min(1).max(500).optional(),
  rawUnit: z.string().trim().min(1).max(50).optional(),
})

const MACHINE_SPECIFICATION_CONTRACT = `Use only these specification keys: portafilterDiameterMm (positive mm), heatingArchitecture (${MACHINE_HEATING_ARCHITECTURE_VALUES.join(', ')}), temperatureControl (${MACHINE_TEMPERATURE_CONTROL_VALUES.join(', ')}), pressureControl (${MACHINE_PRESSURE_CONTROL_VALUES.join(', ')}), flowControl (${MACHINE_FLOW_CONTROL_VALUES.join(', ')}), preinfusionControl (${MACHINE_PREINFUSION_CONTROL_VALUES.join(', ')}), shotStopModes (array containing ${AUTO_STOP_MODE_VALUES.join(', ')}), steamSystem (${MACHINE_STEAM_SYSTEM_VALUES.join(', ')}), simultaneousBrewAndSteam (boolean), groupCount (positive integer), pumpType (${MACHINE_PUMP_TYPE_VALUES.join(', ')}), waterSourceModes (array containing ${MACHINE_WATER_SOURCE_VALUES.join(', ')}), brewPressureMinimumBar, brewPressureMaximumBar, brewTemperatureMinimumCelsius, and brewTemperatureMaximumCelsius. Omit every unknown key.`

const MACHINE_FACTORY_CONTRACT = `Use only these documented factory-default keys: brewPressureBar, preinfusionEnabled, preinfusionTimeSeconds, preinfusionPressureBar, flowLimitMlPerSecond, brewTemperatureOffsetCelsius (signed), programmedVolumeMl, defaultStopMode (${AUTO_STOP_MODE_VALUES.join(', ')}), steamTemperatureCelsius, and steamPressureBar. These are factory defaults only, never an owner's current settings. Omit every unknown key.`

export const MACHINE_RESEARCH_FIELDS = defineStructuredResearchFields({
  specifications: {
    description: MACHINE_SPECIFICATION_CONTRACT,
    jsonType: 'object',
    schema: machineSpecificationsResearchSchema,
    examples: [
      {
        portafilterDiameterMm: 58,
        heatingArchitecture: 'dual_boiler',
        preinfusionControl: 'programmable',
        shotStopModes: ['manual', 'volume'],
      },
    ],
  },
  factorySettings: {
    description: MACHINE_FACTORY_CONTRACT,
    jsonType: 'object',
    schema: machineFactorySettingsResearchSchema,
    examples: [
      {
        brewPressureBar: 9,
        preinfusionEnabled: true,
        preinfusionTimeSeconds: 5,
        defaultStopMode: 'volume',
      },
    ],
  },
  evidence: {
    description:
      'One evidence object for every returned claim. propertyKey must be the exact nested path, such as specifications.portafilterDiameterMm or factorySettings.brewPressureBar. Include sourceUrl, sourceKind, and the source title/raw value/unit when available.',
    jsonType: 'array',
    schema: z.array(machineResearchEvidenceSchema).max(100),
    examples: [
      [
        {
          propertyKey: 'specifications.portafilterDiameterMm',
          sourceUrl: 'https://example.com/exact-model-manual.pdf',
          sourceTitle: 'Exact model instruction manual',
          sourceKind: 'manual',
          rawValue: '58 mm',
          rawUnit: 'mm',
        },
      ],
    ],
  },
})

type ParsedMachineResearch = StructuredResearchResult<
  typeof MACHINE_RESEARCH_FIELDS
>

const STRONG_MACHINE_RESEARCH_SOURCES = new Set<
  MachineResearchEvidence['sourceKind']
>(['manual', 'manufacturer', 'specialist'])

function invalidMachineRangePaths(
  research: ParsedMachineResearch,
): Set<string> {
  const invalid = new Set<string>()
  const specifications = research.specifications
  if (!specifications) return invalid

  if (
    specifications.brewPressureMinimumBar !== undefined &&
    specifications.brewPressureMaximumBar !== undefined &&
    Number(specifications.brewPressureMinimumBar) >
      Number(specifications.brewPressureMaximumBar)
  ) {
    invalid.add('specifications.brewPressureMinimumBar')
    invalid.add('specifications.brewPressureMaximumBar')
  }
  if (
    specifications.brewTemperatureMinimumCelsius !== undefined &&
    specifications.brewTemperatureMaximumCelsius !== undefined &&
    Number(specifications.brewTemperatureMinimumCelsius) >
      Number(specifications.brewTemperatureMaximumCelsius)
  ) {
    invalid.add('specifications.brewTemperatureMinimumCelsius')
    invalid.add('specifications.brewTemperatureMaximumCelsius')
  }
  return invalid
}

export function normalizeMachineResearchResult(
  research: ParsedMachineResearch,
): ExtractedMachineResearch {
  const evidence = research.evidence ?? []
  const strongEvidencePaths = new Set<string>(
    evidence
      .filter((item) => STRONG_MACHINE_RESEARCH_SOURCES.has(item.sourceKind))
      .map((item) => item.propertyKey),
  )
  const rejectedPaths = invalidMachineRangePaths(research)
  const acceptedPaths = new Set<string>()

  const specifications = Object.fromEntries(
    Object.entries(research.specifications ?? {}).filter(([key, value]) => {
      const path = `specifications.${key}`
      const accepted =
        value !== undefined &&
        strongEvidencePaths.has(path) &&
        !rejectedPaths.has(path)
      if (accepted) acceptedPaths.add(path)
      return accepted
    }),
  )
  const factorySettings = Object.fromEntries(
    Object.entries(research.factorySettings ?? {}).filter(([key, value]) => {
      const path = `factorySettings.${key}`
      const accepted =
        value !== undefined &&
        strongEvidencePaths.has(path) &&
        !rejectedPaths.has(path)
      if (accepted) acceptedPaths.add(path)
      return accepted
    }),
  )
  const acceptedEvidence = evidence.filter((item) =>
    acceptedPaths.has(item.propertyKey),
  )

  return {
    ...(Object.keys(specifications).length > 0
      ? {
          specifications:
            machineSpecificationsResearchSchema.parse(specifications),
        }
      : undefined),
    ...(Object.keys(factorySettings).length > 0
      ? {
          factorySettings:
            machineFactorySettingsResearchSchema.parse(factorySettings),
        }
      : undefined),
    ...(acceptedEvidence.length > 0
      ? { evidence: acceptedEvidence }
      : undefined),
  }
}

export function parseMachineResearchResult(
  content: string,
): ExtractedMachineResearch {
  return normalizeMachineResearchResult(
    parseStructuredResearchResult(content, MACHINE_RESEARCH_FIELDS),
  )
}
