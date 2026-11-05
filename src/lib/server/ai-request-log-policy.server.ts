import { getServerEnv } from '@/lib/env.server'
import { type JsonValue, toJsonValue } from '@/lib/json-value'

export const REDACTED_AI_PAYLOAD: JsonValue = { redacted: true }

export type AiTelemetryPolicy = {
  storePayloads: boolean
}

export function getAiTelemetryPolicy(): AiTelemetryPolicy {
  return { storePayloads: getServerEnv().AI_TELEMETRY_STORE_PAYLOADS }
}

export function storedAiPayload(
  value: unknown,
  policy: AiTelemetryPolicy,
): JsonValue {
  if (!policy.storePayloads) return REDACTED_AI_PAYLOAD
  return toJsonValue(value)
}

export function storedAiErrorMessage(
  value: string,
  policy: AiTelemetryPolicy,
): string {
  if (!policy.storePayloads) return 'AI request failed'
  return Buffer.from(value).subarray(0, 512).toString()
}
