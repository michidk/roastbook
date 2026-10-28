import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  generatedAt as modelsDevGeneratedAt,
  providers as modelsDevProviders,
} from '@opencode-ai/models/snapshot'
import { OPENAI_CHAT_MODELS } from '@tanstack/ai-openai'

const CATALOG_FILE = join(process.cwd(), 'scripts/ai-pricing.catalog.json')
const OUTPUT_FILE = join(process.cwd(), 'src/lib/ai-model-pricing.ts')
const CHAT_MODELS: readonly string[] = OPENAI_CHAT_MODELS
const PROVIDERS = ['openai', 'azure', 'azure-cognitive-services'] as const
const PRICING_SOURCE = 'models.dev'
const PRICING_VERSION = modelsDevGeneratedAt

// These aliases are present in TanStack's catalog but not under the same ID
// in models.dev.

// models.dev lists this historical alias under its `codex-mini` ID.
const MODEL_ALIASES: Readonly<Record<string, string>> = {
  'codex-mini-latest': 'codex-mini',
}

// Existing fallback rates are explicit and reviewed. New missing models must
// fail the sync instead of silently copying an old rate.
const APPROVED_FALLBACK_MODELS = new Set([
  'gpt-5.2-chat-latest',
  'gpt-5.1-chat-latest',
  'gpt-5-chat-latest',
  'gpt-5.4-image-2',
  'gpt-audio',
  'gpt-audio-mini',
  'gpt-5.6-luna-pro',
  'gpt-5.6-sol-pro',
  'gpt-5.6-terra-pro',
  'gpt-6-astra-pro',
  'gpt-6-luna-pro',
  'gpt-6-sol-pro',
  'gpt-6.1-sol-pro',
  'o3-deep-research',
  'o4-mini-deep-research',
  'gpt-4o-search-preview',
  'gpt-4o-mini-search-preview',
])

type Tier = {
  readonly input?: number
  readonly output?: number
  readonly cache_read?: number
  readonly tier?: {
    readonly type?: string
    readonly size?: number
  }
}

type Cost = {
  readonly input?: number
  readonly output?: number
  readonly cache_read?: number
  readonly tiers?: readonly Tier[]
  readonly context_over_200k?: {
    readonly input?: number
    readonly output?: number
    readonly cache_read?: number
  }
}

type LongContextRates = {
  readonly thresholdTokens: number
  readonly input: number
  readonly cachedInput: number
  readonly output: number
}

type Rates = {
  readonly input: number
  readonly cachedInput: number
  readonly output: number
  readonly longContext?: LongContextRates
}

type Catalog = typeof modelsDevProviders

function isRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function costRates(cost: Cost | undefined): Rates | undefined {
  if (!cost || !isRate(cost.input) || !isRate(cost.output)) return undefined
  const tier = cost.tiers?.find(
    (entry) =>
      entry.tier?.type === 'context' &&
      isRate(entry.tier.size) &&
      isRate(entry.input) &&
      isRate(entry.output),
  )
  const fallbackTier = cost.context_over_200k
  const longContext = tier
    ? {
        thresholdTokens: tier.tier?.size ?? 0,
        input: tier.input ?? cost.input,
        cachedInput:
          isRate(tier.cache_read) && tier.cache_read > 0
            ? tier.cache_read
            : (tier.input ?? cost.input),
        output: tier.output ?? cost.output,
      }
    : fallbackTier && isRate(fallbackTier.input) && isRate(fallbackTier.output)
      ? {
          thresholdTokens: 200_000,
          input: fallbackTier.input,
          cachedInput:
            isRate(fallbackTier.cache_read) && fallbackTier.cache_read > 0
              ? fallbackTier.cache_read
              : fallbackTier.input,
          output: fallbackTier.output,
        }
      : undefined

  return {
    input: cost.input,
    cachedInput:
      isRate(cost.cache_read) && cost.cache_read > 0
        ? cost.cache_read
        : cost.input,
    output: cost.output,
    ...(longContext ? { longContext } : {}),
  }
}

function ratesFromModelsDev(
  catalog: Catalog,
  existing: Readonly<Record<string, Rates>>,
): { rates: Map<string, Rates>; fallbackModels: ReadonlySet<string> } {
  const rates = new Map<string, Rates>()
  const fallbackModels = new Set<string>()
  const preserved: string[] = []

  for (const model of CHAT_MODELS) {
    const lookup = MODEL_ALIASES[model] ?? model
    let found: Rates | undefined
    for (const provider of PROVIDERS) {
      found = costRates(catalog[provider]?.models?.[lookup]?.cost)
      if (found) break
    }

    if (!found) {
      found = APPROVED_FALLBACK_MODELS.has(model) ? existing[model] : undefined
      if (found) {
        fallbackModels.add(model)
        preserved.push(model)
      }
    }
    if (!found) {
      throw new Error(
        `No models.dev pricing found for ${model}; add an explicit fallback.`,
      )
    }
    rates.set(model, found)
  }

  if (preserved.length > 0) {
    console.info(`Preserved existing rates for: ${preserved.join(', ')}`)
  }
  return { rates, fallbackModels }
}

function formatModelKey(model: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(model) ? model : `'${model}'`
}

function renderTable(
  rates: ReadonlyMap<string, Rates>,
  fallbackModels: ReadonlySet<string>,
): string {
  const entries = [...rates.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([model, rate]) => {
      const key = formatModelKey(model)
      if (!rate.longContext) {
        return `  ${key}: { input: ${rate.input}, cachedInput: ${rate.cachedInput}, output: ${rate.output} },`
      }
      return `  ${key}: {
    input: ${rate.input},
    cachedInput: ${rate.cachedInput},
    output: ${rate.output},
    longContext: {
      thresholdTokens: ${rate.longContext.thresholdTokens},
      input: ${rate.longContext.input},
      cachedInput: ${rate.longContext.cachedInput},
      output: ${rate.longContext.output},
    },
  },`
    })
    .join('\n')

  return `// Generated by scripts/sync-ai-pricing.ts from the models.dev catalog.
// Do not edit manually; run \`bun run sync:ai-pricing\` instead.

export const MODEL_PRICING_SOURCE = '${PRICING_SOURCE}' as const
export const MODEL_PRICING_VERSION = '${PRICING_VERSION}' as const
export const MODEL_PRICING_FALLBACK_MODELS = new Set([
${[...fallbackModels]
  .sort()
  .map((model) => `  '${model}',`)
  .join('\n')}
]) as ReadonlySet<string>

export type ModelTokenRates = {
  readonly input: number
  readonly cachedInput: number
  readonly output: number
  readonly longContext?: {
    readonly thresholdTokens: number
    readonly input: number
    readonly cachedInput: number
    readonly output: number
  }
}

export const MODEL_TOKEN_RATES: Readonly<Record<string, ModelTokenRates>> = {
${entries}
}
`
}

async function readExistingCatalog(): Promise<Record<string, Rates>> {
  try {
    return JSON.parse(await readFile(CATALOG_FILE, 'utf8')) as Record<
      string,
      Rates
    >
  } catch {
    return {}
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--check')) {
    const existing = await readExistingCatalog()
    if (Object.keys(existing).length === 0) {
      throw new Error(
        'Pricing catalog is missing. Run `bun run sync:ai-pricing`.',
      )
    }
    const { rates, fallbackModels } = ratesFromModelsDev(
      modelsDevProviders,
      existing,
    )
    const output = renderTable(rates, fallbackModels)
    const catalog = `${JSON.stringify(
      Object.fromEntries(
        [...rates.entries()].sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        ),
      ),
      null,
      2,
    )}\n`
    const currentCatalog = await readFile(CATALOG_FILE, 'utf8').catch(() => '')
    const current = await readFile(OUTPUT_FILE, 'utf8').catch(() => '')
    if (current !== output || currentCatalog !== catalog) {
      console.error(
        'AI pricing table is out of date. Run `bun run sync:ai-pricing`.',
      )
      process.exitCode = 1
      return
    }
    console.info('AI pricing table is up to date')
    return
  }

  const existing = await readExistingCatalog()
  const { rates, fallbackModels } = ratesFromModelsDev(
    modelsDevProviders,
    existing,
  )
  const sorted = Object.fromEntries(
    [...rates.entries()].sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  )

  await writeFile(CATALOG_FILE, `${JSON.stringify(sorted, null, 2)}\n`)
  await writeFile(OUTPUT_FILE, renderTable(rates, fallbackModels))
  console.info(`Wrote ${rates.size} model prices from models.dev`)
}

await main()
