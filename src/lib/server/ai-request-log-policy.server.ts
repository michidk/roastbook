import { getServerEnv } from '@/lib/env.server'
import { type JsonValue, toJsonValue } from '@/lib/json-value'

export const REDACTED_AI_PAYLOAD: JsonValue = { redacted: true }

export type AiTelemetryPolicy = {
  storePayloads: boolean
  retentionDays: number
  maxPayloadBytes: number
}

export function getAiTelemetryPolicy(): AiTelemetryPolicy {
  const environment = getServerEnv()
  return {
    storePayloads: environment.AI_TELEMETRY_STORE_PAYLOADS,
    retentionDays: environment.AI_TELEMETRY_RETENTION_DAYS,
    maxPayloadBytes: environment.AI_TELEMETRY_MAX_PAYLOAD_BYTES,
  }
}

export function storedAiPayload(
  value: unknown,
  policy: AiTelemetryPolicy,
): JsonValue {
  if (!policy.storePayloads) return REDACTED_AI_PAYLOAD

  const payload = toJsonValue(value)
  const sizeBytes = Buffer.byteLength(JSON.stringify(payload))
  if (sizeBytes <= policy.maxPayloadBytes) return payload

  return { redacted: true, reason: 'payload_too_large', sizeBytes }
}

export function storedAiErrorMessage(
  value: string,
  policy: AiTelemetryPolicy,
): string {
  if (!policy.storePayloads) return 'AI request failed'
  return Buffer.from(value).subarray(0, 512).toString()
}
