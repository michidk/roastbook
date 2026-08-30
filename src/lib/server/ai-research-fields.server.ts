import { z } from 'zod'
import {
  AUTO_STOP_MODE_VALUES,
  BEAN_TYPE_VALUES,
  PROCESS_METHOD_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'
import {
  buildStructuredResearchPrompt,
  defineStructuredResearchFields,
} from '@/lib/structured-research'

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
