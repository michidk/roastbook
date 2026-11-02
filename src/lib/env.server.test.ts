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
      AI_CREDENTIAL_ENCRYPTION_KEY: '',
      STORAGE_PATH: '',
    })

    expect(environment.AI_CREDENTIAL_ENCRYPTION_KEY).toBeUndefined()
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

describe('authentication deployment configuration', () => {
  const authenticated = {
    DATABASE_URL: databaseUrl,
    AUTH_ENABLED: 'true',
    AUTH_URL: 'https://coffee.example.test',
    AUTH_SECRET: 'a'.repeat(64),
    EMAIL_FROM: 'coffee@example.test',
    SMTP_URL: 'smtp://localhost:1025',
  }
  test('keeps self-hosted authentication optional', () => {
    expect(parseServerEnv({ DATABASE_URL: databaseUrl }).AUTH_ENABLED).toBe(
      false,
    )
    expect(parseServerEnv(authenticated).AUTH_ENABLED).toBe(true)
  })
  test('requires authentication, HTTPS, and explicit administrator bootstrap for hosted mode', () => {
    expect(() =>
      parseServerEnv({ DATABASE_URL: databaseUrl, DEPLOYMENT_MODE: 'hosted' }),
    ).toThrow('AUTH_ENABLED')
    expect(() =>
      parseServerEnv({ ...authenticated, DEPLOYMENT_MODE: 'hosted' }),
    ).toThrow('AUTH_ADMIN_EMAIL')
    expect(() =>
      parseServerEnv({
        ...authenticated,
        DEPLOYMENT_MODE: 'hosted',
        AUTH_ADMIN_EMAIL: 'owner@example.test',
        AUTH_URL: 'http://coffee.example.test',
      }),
    ).toThrow('HTTPS')
    expect(
      parseServerEnv({
        ...authenticated,
        DEPLOYMENT_MODE: 'hosted',
        AUTH_ADMIN_EMAIL: 'Owner@example.test',
      }).AUTH_ADMIN_EMAIL,
    ).toBe('owner@example.test')
  })
  test('requires a delivery provider and strong application secret', () => {
    expect(() => parseServerEnv({ ...authenticated, SMTP_URL: '' })).toThrow(
      'SMTP_URL',
    )
    expect(() =>
      parseServerEnv({ ...authenticated, AUTH_SECRET: 'short' }),
    ).toThrow('AUTH_SECRET')
    expect(() =>
      parseServerEnv({
        ...authenticated,
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: '',
      }),
    ).toThrow('RESEND_API_KEY')
  })
})

test('validates the AI encryption key and confines private AI origins to self-hosting', () => {
  const value = Buffer.alloc(32, 7).toString('base64')
  expect(
    parseServerEnv({
      DATABASE_URL: databaseUrl,
      AI_CREDENTIAL_ENCRYPTION_KEY: value,
    }).AI_CREDENTIAL_ENCRYPTION_KEY,
  ).toBe(value)
  expect(() =>
    parseServerEnv({
      DATABASE_URL: databaseUrl,
      AI_CREDENTIAL_ENCRYPTION_KEY: 'short',
    }),
  ).toThrow('AI_CREDENTIAL_ENCRYPTION_KEY')
  for (const origin of [
    'http://localhost:11434/v1',
    'https://user:pass@provider.example',
    '*',
  ])
    expect(() =>
      parseServerEnv({
        DATABASE_URL: databaseUrl,
        AI_ALLOWED_PRIVATE_ORIGINS: origin,
      }),
    ).toThrow('AI_ALLOWED_PRIVATE_ORIGINS')
  expect(
    parseServerEnv({
      DATABASE_URL: databaseUrl,
      AI_ALLOWED_PRIVATE_ORIGINS: 'http://ollama:11434',
    }).AI_ALLOWED_PRIVATE_ORIGINS,
  ).toBe('http://ollama:11434')
  expect(() =>
    parseServerEnv({
      DATABASE_URL: databaseUrl,
      DEPLOYMENT_MODE: 'hosted',
      AI_ALLOWED_PRIVATE_ORIGINS: 'http://localhost:11434',
    }),
  ).toThrow('AI_ALLOWED_PRIVATE_ORIGINS')
})

describe('provided AI deployment configuration', () => {
  const base = {
    DATABASE_URL: databaseUrl,
    AUTH_ENABLED: 'true',
    AUTH_URL: 'https://coffee.example.test',
    AUTH_SECRET: 'a'.repeat(64),
    EMAIL_FROM: 'coffee@example.test',
    SMTP_URL: 'smtp://localhost:1025',
  }
  const legacy = {
    OPENAI_API_KEY: 'existing-operator-key',
    OPENAI_BASE_URL: 'http://omniroute.internal:20128/v1',
    OPENAI_VISION_MODEL: 'existing-vision',
    OPENAI_RESEARCH_MODEL: 'existing-research',
  }
  test('reuses the complete existing operator provider, including internal endpoints', () => {
    expect(parseServerEnv({ ...base, ...legacy })).toMatchObject({
      AI_PROVIDED_API_KEY: legacy.OPENAI_API_KEY,
      AI_PROVIDED_BASE_URL: legacy.OPENAI_BASE_URL,
      AI_PROVIDED_API: 'responses',
      AI_PROVIDED_VISION_MODEL: legacy.OPENAI_VISION_MODEL,
      AI_PROVIDED_RESEARCH_MODEL: legacy.OPENAI_RESEARCH_MODEL,
    })
    expect(
      parseServerEnv({ ...base, OPENAI_API_KEY: legacy.OPENAI_API_KEY }),
    ).toMatchObject({
      AI_PROVIDED_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDED_VISION_MODEL: 'gpt-5.1-codex',
      AI_PROVIDED_RESEARCH_MODEL: 'gpt-5.1-codex',
    })
    expect(
      parseServerEnv({ ...base, ...legacy, AI_PROVIDED_API_KEY: '  ' })
        .AI_PROVIDED_API_KEY,
    ).toBe(legacy.OPENAI_API_KEY)
  })
  test('never combines a new provider key with the existing endpoint or models', () => {
    expect(
      parseServerEnv({
        ...base,
        ...legacy,
        AI_PROVIDED_API_KEY: 'new-provider-key',
        AI_PROVIDED_VISION_MODEL: 'new-vision',
        AI_PROVIDED_RESEARCH_MODEL: 'new-research',
      }),
    ).toMatchObject({
      AI_PROVIDED_API_KEY: 'new-provider-key',
      AI_PROVIDED_BASE_URL: 'https://api.openai.com/v1',
      AI_PROVIDED_VISION_MODEL: 'new-vision',
      AI_PROVIDED_RESEARCH_MODEL: 'new-research',
    })
    expect(() =>
      parseServerEnv({ ...base, ...legacy, AI_PROVIDED_API_KEY: 'new-key' }),
    ).toThrow('AI_PROVIDED_VISION_MODEL')
    expect(
      parseServerEnv({
        ...base,
        ...legacy,
        AI_PROVIDED_BASE_URL: 'https://new-provider.example/v1',
      }).AI_PROVIDED_API_KEY,
    ).toBeUndefined()
  })
  test('accepts unused operator configuration when authentication is disabled', () => {
    expect(
      parseServerEnv({ DATABASE_URL: databaseUrl, ...legacy }).AUTH_ENABLED,
    ).toBe(false)
    expect(() =>
      parseServerEnv({
        ...base,
        ...legacy,
        OPENAI_BASE_URL: 'https://user:password@example.test/v1',
      }),
    ).toThrow('AI_PROVIDED_BASE_URL')
  })
  test('requires explicit models only when authentication enables the operator key', () => {
    expect(
      parseServerEnv({
        DATABASE_URL: databaseUrl,
        AI_PROVIDED_API_KEY: 'fixture-key',
      }).AUTH_ENABLED,
    ).toBe(false)
    expect(() =>
      parseServerEnv({ ...base, AI_PROVIDED_API_KEY: 'fixture-key' }),
    ).toThrow('AI_PROVIDED_VISION_MODEL')
    expect(
      parseServerEnv({
        ...base,
        AI_PROVIDED_API_KEY: 'fixture-key',
        AI_PROVIDED_VISION_MODEL: 'vision',
        AI_PROVIDED_RESEARCH_MODEL: 'research',
      }).AI_PROVIDED_API,
    ).toBe('responses')
  })
  test('rejects operator endpoint URLs that could forward credentials unexpectedly', () => {
    for (const endpoint of [
      'file:///tmp/provider',
      'https://user:password@example.test/v1',
      'https://example.test/v1?key=secret',
      'https://example.test/v1#fragment',
    ]) {
      expect(() =>
        parseServerEnv({ ...base, AI_PROVIDED_BASE_URL: endpoint }),
      ).toThrow('AI_PROVIDED_BASE_URL')
    }
  })
})
