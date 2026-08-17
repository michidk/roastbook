import '@tanstack/react-start/server-only'

import { createEnv, type StandardSchemaV1 } from '@t3-oss/env-core'
import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()

const serverSchema = {
  DATABASE_URL: z.string().trim().min(1),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().trim().min(1).default('./uploads'),
  STORAGE_URL: z.string().trim().min(1).default('/media'),
  S3_BUCKET: optionalString,
  S3_REGION: z.string().trim().min(1).default('us-east-1'),
  S3_ENDPOINT: z.url().optional(),
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_BASE_URL: z.url().default('https://api.openai.com/v1'),
  OPENAI_VISION_MODEL: z.string().trim().min(1).default('gpt-4o'),
  OPENAI_RESEARCH_MODEL: z.string().trim().min(1).default('gpt-4o'),
}

const s3RequiredVariables = [
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const

type RuntimeEnvironment = Record<string, string | undefined>

function issueVariable(issue: StandardSchemaV1.Issue): string | undefined {
  const segment = issue.path?.[0]
  if (typeof segment === 'string') return segment
  if (segment && typeof segment === 'object') return String(segment.key)
  return undefined
}

function validationError(issues: readonly StandardSchemaV1.Issue[]): never {
  const variables = issues
    .map(issueVariable)
    .filter((variable): variable is string => Boolean(variable))

  if (variables.includes('DATABASE_URL')) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const details = issues
    .map((issue) => {
      const variable = issueVariable(issue)
      return variable ? `${variable}: ${issue.message}` : issue.message
    })
    .join('; ')

  throw new Error(`Invalid environment configuration: ${details}`)
}

export function parseServerEnv(runtimeEnvironment: RuntimeEnvironment) {
  return createEnv({
    server: serverSchema,
    runtimeEnvStrict: {
      DATABASE_URL: runtimeEnvironment.DATABASE_URL,
      STORAGE_PROVIDER: runtimeEnvironment.STORAGE_PROVIDER,
      STORAGE_PATH: runtimeEnvironment.STORAGE_PATH,
      STORAGE_URL: runtimeEnvironment.STORAGE_URL,
      S3_BUCKET: runtimeEnvironment.S3_BUCKET,
      S3_REGION: runtimeEnvironment.S3_REGION,
      S3_ENDPOINT: runtimeEnvironment.S3_ENDPOINT,
      S3_ACCESS_KEY_ID: runtimeEnvironment.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: runtimeEnvironment.S3_SECRET_ACCESS_KEY,
      OPENAI_API_KEY: runtimeEnvironment.OPENAI_API_KEY,
      OPENAI_BASE_URL: runtimeEnvironment.OPENAI_BASE_URL,
      OPENAI_VISION_MODEL: runtimeEnvironment.OPENAI_VISION_MODEL,
      OPENAI_RESEARCH_MODEL: runtimeEnvironment.OPENAI_RESEARCH_MODEL,
    },
    emptyStringAsUndefined: true,
    isServer: true,
    createFinalSchema: (shape) =>
      z.object(shape).superRefine((environment, context) => {
        if (environment.STORAGE_PROVIDER !== 's3') return

        for (const variable of s3RequiredVariables) {
          if (environment[variable]) continue
          context.addIssue({
            code: 'custom',
            path: [variable],
            message: 'Required when STORAGE_PROVIDER is s3',
          })
        }
      }),
    onValidationError: validationError,
  })
}

export type ServerEnv = ReturnType<typeof parseServerEnv>

let cachedEnvironment: ServerEnv | undefined

export const getServerEnv = createServerOnlyFn((): ServerEnv => {
  cachedEnvironment ??= parseServerEnv(process.env)
  return cachedEnvironment
})
