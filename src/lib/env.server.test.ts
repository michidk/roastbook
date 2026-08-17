import { describe, expect, test } from 'bun:test'
import { parseServerEnv } from '@/lib/env.server'

const databaseUrl = 'postgresql://roastbook:roastbook@localhost:5432/roastbook'

describe('server environment', () => {
  test('applies local storage and AI defaults', () => {
    const environment = parseServerEnv({ DATABASE_URL: databaseUrl })

    expect(environment).toMatchObject({
      DATABASE_URL: databaseUrl,
      DEMO_MODE: false,
      STORAGE_PROVIDER: 'local',
      STORAGE_PATH: './uploads',
      STORAGE_URL: '/media',
      S3_REGION: 'us-east-1',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_VISION_MODEL: 'gpt-4o',
      OPENAI_RESEARCH_MODEL: 'gpt-4o',
    })
  })

  test('parses demo mode as a boolean', () => {
    expect(
      parseServerEnv({ DATABASE_URL: databaseUrl, DEMO_MODE: 'true' })
        .DEMO_MODE,
    ).toBe(true)
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
