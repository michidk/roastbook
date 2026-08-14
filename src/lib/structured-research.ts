import type { z } from 'zod'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

export type StructuredResearchJsonType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'

export type StructuredResearchField<TSchema extends z.ZodType = z.ZodType> = {
  readonly description: string
  readonly jsonType: StructuredResearchJsonType
  readonly schema: TSchema
  readonly examples: readonly [JsonValue, ...JsonValue[]]
  readonly options?: readonly [JsonValue, ...JsonValue[]]
  readonly format?: string
}

export type StructuredResearchFields = Record<string, StructuredResearchField>

export type StructuredResearchResult<TFields extends StructuredResearchFields> =
  Partial<{
    [TKey in keyof TFields]: z.output<TFields[TKey]['schema']>
  }>

export function defineStructuredResearchFields<
  const TFields extends StructuredResearchFields,
>(fields: TFields): TFields {
  return fields
}

function formatJsonValues(values: readonly JsonValue[]) {
  return values.map((value) => JSON.stringify(value)).join(', ')
}

function describeField(name: string, field: StructuredResearchField): string {
  const details = [
    `JSON type: ${field.jsonType}`,
    field.format ? `format: ${field.format}` : null,
    field.options ? `allowed values: ${formatJsonValues(field.options)}` : null,
    `examples: ${formatJsonValues(field.examples)}`,
  ].filter(Boolean)

  return `- ${name}: ${field.description}\n  ${details.join('; ')}`
}

export function buildStructuredResearchPrompt<
  TFields extends StructuredResearchFields,
>({
  role,
  task,
  fields,
  evidenceRules,
}: {
  readonly role: string
  readonly task: string
  readonly fields: TFields
  readonly evidenceRules: readonly string[]
}): string {
  const fieldContract = Object.entries(fields)
    .map(([name, field]) => describeField(name, field))
    .join('\n')
  const evidenceContract = evidenceRules.map((rule) => `- ${rule}`).join('\n')

  return `${role}. ${task}

Return one JSON object using this property contract:
${fieldContract}

Research process:
- Treat every property in the contract as a separate research question and actively investigate each one.
- Do not stop after the first useful page; inspect deeper sources such as manuals, support documents, technical specifications, and reputable specialist references when relevant.
- Search for equivalent domain terminology and map it to the requested property when the meaning is unambiguous.

Evidence rules:
${evidenceContract}

Output rules:
- Use the property names exactly as written above.
- Return every value using its specified JSON type and format.
- For fields with allowed values, return only one of those exact values.
- Omit properties that are unknown, ambiguous, or unsupported; do not return null or invent a value.
- Do not add properties that are not in the contract.
- Return only valid JSON, without markdown or commentary.`
}

function parseJsonCandidate(candidate: string | undefined): unknown {
  if (!candidate) return undefined

  try {
    return JSON.parse(candidate)
  } catch {
    return undefined
  }
}

function parseSupportedJsonResponse(content: string): unknown {
  const trimmedContent = content.trim()
  const fencedJson = trimmedContent.match(
    /```(?:json)?\s*([\s\S]*?)\s*```/i,
  )?.[1]

  return parseJsonCandidate(trimmedContent) ?? parseJsonCandidate(fencedJson)
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function selectValidResearchFields(
  source: Record<string, unknown>,
  fields: StructuredResearchFields,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [name, field] of Object.entries(fields)) {
    if (!(name in source)) continue
    const value = field.schema.safeParse(source[name])
    if (value.success) result[name] = value.data
  }

  return result
}

export function parseStructuredResearchResult<
  TFields extends StructuredResearchFields,
>(content: string, fields: TFields): StructuredResearchResult<TFields> {
  const parsed = parseSupportedJsonResponse(content)
  if (!isJsonObject(parsed)) return {}

  return selectValidResearchFields(
    parsed,
    fields,
  ) as StructuredResearchResult<TFields>
}
