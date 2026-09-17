import { describe, expect, test } from 'bun:test'
import { parseServerEnv } from '@/lib/env.server'

const databaseUrl = 'postgresql://roastbook:roastbook@localhost:5432/roastbook'

describe('server environment', () => {
  test('applies local storage and AI defaults', () => {
    const environment = parseServerEnv({ DATABASE_URL: databaseUrl })

    expect(environment).toMatchObject({
      DATABASE_URL: databaseUrl,
      STORAGE_PROVIDER: 'local',
      STORAGE_PATH: './uploads',
      STORAGE_URL: '/media',
      S3_REGION: 'us-east-1',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_VISION_MODEL: 'gpt-4o',
      OPENAI_RESEARCH_MODEL: 'gpt-4o',
      AI_TELEMETRY_STORE_PAYLOADS: false,
      AI_TELEMETRY_RETENTION_DAYS: 1,
      AI_TELEMETRY_MAX_PAYLOAD_BYTES: 65_536,
    })
  })

  test('bounds detailed AI telemetry configuration', () => {
    const environment = parseServerEnv({
      DATABASE_URL: databaseUrl,
      AI_TELEMETRY_STORE_PAYLOADS: 'true',
      AI_TELEMETRY_RETENTION_DAYS: '7',
      AI_TELEMETRY_MAX_PAYLOAD_BYTES: '32768',
    })

    expect(environment).toMatchObject({
      AI_TELEMETRY_STORE_PAYLOADS: true,
      AI_TELEMETRY_RETENTION_DAYS: 7,
      AI_TELEMETRY_MAX_PAYLOAD_BYTES: 32_768,
    })
    expect(() =>
      parseServerEnv({
        DATABASE_URL: databaseUrl,
        AI_TELEMETRY_RETENTION_DAYS: '31',
      }),
    ).toThrow('AI_TELEMETRY_RETENTION_DAYS')
  })

  test('treats empty optional values as unset', () => {
    const environment = parseServerEnv({
      DATABASE_URL: databaseUrl,
      OPENAI_API_KEY: '',
      STORAGE_PATH: '',
    })

    expect(environment.OPENAI_API_KEY).toBeUndefined()
    expect(environment.STORAGE_PATH).toBe('./uploads')
  })

  test('requires the database URL', () => {
    expect(() => parseServerEnv({})).toThrow(
      'DATABASE_URL environment variable is required',
    )
  })

  test('requires S3 credentials when S3 storage is selected', () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: databaseUrl,
        STORAGE_PROVIDER: 's3',
      }),
    ).toThrow('S3_BUCKET: Required when STORAGE_PROVIDER is s3')
  })

  test('accepts complete S3 configuration', () => {
    const environment = parseServerEnv({
      DATABASE_URL: databaseUrl,
      STORAGE_PROVIDER: 's3',
      S3_BUCKET: 'roastbook',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
    })

    expect(environment).toMatchObject({
      STORAGE_PROVIDER: 's3',
      S3_BUCKET: 'roastbook',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
    })
  })
})
