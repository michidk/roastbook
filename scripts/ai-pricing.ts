import {
  generatedAt as modelsDevGeneratedAt,
  providers as modelsDevProviders,
} from '@opencode-ai/models/snapshot'
import { OPENAI_CHAT_MODELS } from '@tanstack/ai-openai'
import type { Plugin } from 'vite'
import fallbackRates from './ai-pricing.fallbacks.json'

/** Import this to read the pricing table generated at build time. */
export const AI_PRICING_MODULE = 'virtual:roastbook/ai-model-pricing'

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

// Fallback rates in ai-pricing.fallbacks.json are explicit and reviewed. New
// missing models must fail the build instead of silently copying an old rate.
const FALLBACK_RATES: Readonly<Record<string, Rates>> = fallbackRates

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

function ratesFromModelsDev(catalog: Catalog): {
  rates: Map<string, Rates>
  fallbackModels: ReadonlySet<string>
} {
  const rates = new Map<string, Rates>()
  const fallbackModels = new Set<string>()

  for (const model of CHAT_MODELS) {
    const lookup = MODEL_ALIASES[model] ?? model
    let found: Rates | undefined
    for (const provider of PROVIDERS) {
      found = costRates(catalog[provider]?.models?.[lookup]?.cost)
      if (found) break
    }

    if (!found) {
      found = FALLBACK_RATES[model]
      if (found) fallbackModels.add(model)
    }
    if (!found) {
      throw new Error(
        `No models.dev pricing found for ${model}; add an explicit fallback.`,
      )
    }
    rates.set(model, found)
  }

  return { rates, fallbackModels }
}

function renderTable(
  rates: ReadonlyMap<string, Rates>,
  fallbackModels: ReadonlySet<string>,
): string {
  return [
    '// Generated at build time by scripts/ai-pricing.ts from the models.dev catalog.',
    `export const MODEL_PRICING_SOURCE = ${JSON.stringify(PRICING_SOURCE)}`,
    `export const MODEL_PRICING_VERSION = ${JSON.stringify(PRICING_VERSION)}`,
    `export const MODEL_PRICING_FALLBACK_MODELS = new Set(${JSON.stringify([...fallbackModels].sort())})`,
    `export const MODEL_TOKEN_RATES = ${JSON.stringify(Object.fromEntries(rates))}`,
  ].join('\n')
}

/** The pricing module source. Throws when a supported model has no rate. */
export function aiPricingModule(): string {
  const { rates, fallbackModels } = ratesFromModelsDev(modelsDevProviders)
  return renderTable(rates, fallbackModels)
}

export function aiPricing(): Plugin {
  const id = `\0${AI_PRICING_MODULE}`
  return {
    name: 'roastbook-ai-pricing',
    resolveId: (source) => (source === AI_PRICING_MODULE ? id : null),
    load: (source) => (source === id ? aiPricingModule() : null),
  }
}
