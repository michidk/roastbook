import '@tanstack/react-start/server-only'
import { createEnv, type StandardSchemaV1 } from '@t3-oss/env-core'
import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolveExtensionEnvironment } from '@/lib/server/runtime-extension.server'

const optionalString = z.string().trim().min(1).optional()
const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true')

// Comma-separated addresses, compared in lowercase.
const emailList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.email()))

const serverSchema = {
  ROASTBOOK_SOURCE_REVISION: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .optional(),
  AUTH_ENABLED: booleanString,
  DEPLOYMENT_MODE: z.enum(['self-hosted', 'hosted']).default('self-hosted'),
  AUTH_URL: z.url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_SIGNUP_ENABLED: booleanString,
  AUTH_ADMIN_EMAIL: emailList,
  AUTH_ALLOWED_EMAILS: emailList,
  AUTH_IP_HEADER: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .default('x-real-ip'),
  EMAIL_PROVIDER: z.enum(['smtp', 'resend']).default('smtp'),
  EMAIL_FROM: optionalString,
  SMTP_URL: z.url().optional(),
  RESEND_API_KEY: optionalString,
  DATABASE_PROVIDER: z.enum(['postgres']).default('postgres'),
  DATABASE_URL: z.string().trim().default(''),
  IMAGE_MAX_PER_ITEM: z.coerce.number().int().min(1).max(100).default(3),
  IMAGE_STORAGE_LIMIT_MIB: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_048_576)
    .optional(),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().trim().min(1).default('./uploads'),
  STORAGE_URL: z.string().trim().min(1).default('/media'),
  S3_BUCKET: optionalString,
  S3_REGION: z.string().trim().min(1).default('us-east-1'),
  S3_ENDPOINT: z.url().optional(),
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  AI_CREDENTIAL_ENCRYPTION_KEY: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/)
    .refine(
      (value) =>
        Buffer.from(value, 'base64').length === 32 &&
        Buffer.from(value, 'base64').toString('base64') === value,
      'Use a base64-encoded 32-byte encryption key',
    )
    .optional(),
  AI_ALLOWED_PRIVATE_ORIGINS: optionalString,
  AI_TELEMETRY_STORE_PAYLOADS: booleanString,
  AI_TELEMETRY_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .default(1),
  AI_TELEMETRY_MAX_PAYLOAD_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(1_048_576)
    .default(65_536),
  MCP_ALLOWED_HOSTS: optionalString,
  MCP_ALLOWED_ORIGINS: optionalString,
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

export function parseServerEnv(
  runtimeEnvironment: RuntimeEnvironment,
  { managed = false }: { managed?: boolean } = {},
) {
  return createEnv({
    server: serverSchema,
    runtimeEnvStrict: {
      ROASTBOOK_SOURCE_REVISION: runtimeEnvironment.ROASTBOOK_SOURCE_REVISION,
      AUTH_ENABLED: runtimeEnvironment.AUTH_ENABLED,
      DEPLOYMENT_MODE: runtimeEnvironment.DEPLOYMENT_MODE,
      AUTH_URL: runtimeEnvironment.AUTH_URL,
      AUTH_SECRET: runtimeEnvironment.AUTH_SECRET,
      AUTH_SIGNUP_ENABLED: runtimeEnvironment.AUTH_SIGNUP_ENABLED,
      AUTH_ADMIN_EMAIL: runtimeEnvironment.AUTH_ADMIN_EMAIL,
      AUTH_ALLOWED_EMAILS: runtimeEnvironment.AUTH_ALLOWED_EMAILS,
      AUTH_IP_HEADER: runtimeEnvironment.AUTH_IP_HEADER,
      EMAIL_PROVIDER: runtimeEnvironment.EMAIL_PROVIDER,
      EMAIL_FROM: runtimeEnvironment.EMAIL_FROM,
      SMTP_URL: runtimeEnvironment.SMTP_URL,
      RESEND_API_KEY: runtimeEnvironment.RESEND_API_KEY,

      DATABASE_PROVIDER: runtimeEnvironment.DATABASE_PROVIDER,
      DATABASE_URL: runtimeEnvironment.DATABASE_URL,
      STORAGE_PROVIDER: runtimeEnvironment.STORAGE_PROVIDER,
      IMAGE_MAX_PER_ITEM: runtimeEnvironment.IMAGE_MAX_PER_ITEM,
      IMAGE_STORAGE_LIMIT_MIB: runtimeEnvironment.IMAGE_STORAGE_LIMIT_MIB,
      STORAGE_PATH: runtimeEnvironment.STORAGE_PATH,
      STORAGE_URL: runtimeEnvironment.STORAGE_URL,
      S3_BUCKET: runtimeEnvironment.S3_BUCKET,
      S3_REGION: runtimeEnvironment.S3_REGION,
      S3_ENDPOINT: runtimeEnvironment.S3_ENDPOINT,
      S3_ACCESS_KEY_ID: runtimeEnvironment.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: runtimeEnvironment.S3_SECRET_ACCESS_KEY,
      AI_CREDENTIAL_ENCRYPTION_KEY:
        runtimeEnvironment.AI_CREDENTIAL_ENCRYPTION_KEY,
      AI_ALLOWED_PRIVATE_ORIGINS: runtimeEnvironment.AI_ALLOWED_PRIVATE_ORIGINS,
      AI_TELEMETRY_STORE_PAYLOADS:
        runtimeEnvironment.AI_TELEMETRY_STORE_PAYLOADS,
      AI_TELEMETRY_RETENTION_DAYS:
        runtimeEnvironment.AI_TELEMETRY_RETENTION_DAYS,
      AI_TELEMETRY_MAX_PAYLOAD_BYTES:
        runtimeEnvironment.AI_TELEMETRY_MAX_PAYLOAD_BYTES,
      MCP_ALLOWED_HOSTS: runtimeEnvironment.MCP_ALLOWED_HOSTS,
      MCP_ALLOWED_ORIGINS: runtimeEnvironment.MCP_ALLOWED_ORIGINS,
    },
    emptyStringAsUndefined: true,
    isServer: true,
    createFinalSchema: (shape) =>
      z.object(shape).superRefine((environment, context) => {
        if (!managed && !environment.DATABASE_URL)
          context.addIssue({
            code: 'custom',
            path: ['DATABASE_URL'],
            message: 'Required for PostgreSQL deployments',
          })
        const requireVariable = (name: string, present: unknown) => {
          if (!present)
            context.addIssue({
              code: 'custom',
              path: [name],
              message: 'Required for authenticated deployments',
            })
        }
        if (
          environment.DEPLOYMENT_MODE === 'hosted' &&
          !environment.AUTH_ENABLED
        ) {
          context.addIssue({
            code: 'custom',
            path: ['AUTH_ENABLED'],
            message: 'Must be true for hosted deployments',
          })
        }
        if (environment.AI_ALLOWED_PRIVATE_ORIGINS) {
          const origins = environment.AI_ALLOWED_PRIVATE_ORIGINS.split(',').map(
            (value) => value.trim(),
          )
          if (
            environment.DEPLOYMENT_MODE === 'hosted' ||
            origins.some((value) => {
              try {
                const url = new URL(value)
                return (
                  !['https:', 'http:'].includes(url.protocol) ||
                  url.origin !== value ||
                  !!url.username ||
                  !!url.password
                )
              } catch {
                return true
              }
            })
          )
            context.addIssue({
              code: 'custom',
              path: ['AI_ALLOWED_PRIVATE_ORIGINS'],
              message:
                'Use exact HTTP(S) origins, only on self-hosted deployments',
            })
        }
        if (environment.AUTH_ENABLED) {
          requireVariable('AUTH_URL', environment.AUTH_URL)
          requireVariable('AUTH_SECRET', environment.AUTH_SECRET)
          requireVariable('EMAIL_FROM', environment.EMAIL_FROM)
          if (!managed)
            requireVariable(
              environment.EMAIL_PROVIDER === 'smtp'
                ? 'SMTP_URL'
                : 'RESEND_API_KEY',
              environment.EMAIL_PROVIDER === 'smtp'
                ? environment.SMTP_URL
                : environment.RESEND_API_KEY,
            )
          if (environment.DEPLOYMENT_MODE === 'hosted') {
            requireVariable(
              'AUTH_ADMIN_EMAIL',
              environment.AUTH_ADMIN_EMAIL.length,
            )
            if (
              environment.AUTH_URL &&
              !environment.AUTH_URL.startsWith('https://')
            )
              context.addIssue({
                code: 'custom',
                path: ['AUTH_URL'],
                message: 'Hosted authentication requires HTTPS',
              })
          }
        }
        if (managed || environment.STORAGE_PROVIDER !== 's3') return

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
  const extended = resolveExtensionEnvironment((variables) =>
    parseServerEnv(variables, { managed: true }),
  )
  if (extended) return extended
  cachedEnvironment ??= parseServerEnv(process.env)
  return cachedEnvironment
})
