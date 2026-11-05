import '@tanstack/react-start/server-only'

import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  deleteEntityImage,
  setImageAsThumbnail,
  uploadEntityImage,
} from '@/journal/images'
import { getStorage } from '@/journal/platform/storage'
import { decodeBase64 } from '@/lib/base64'
import { IMAGE_MIME_TYPE_VALUES, MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import { imageFilenameSchema, positiveIdSchema } from '@/lib/server-validation'
import type { IntegrationResource } from '@/modules/integrations/scopes'
import type { IntegrationContext } from './operation.server'

/** Public entity names use journal vocabulary ("brews", "places"). */
const IMAGE_ENTITIES = {
  brews: { entityType: 'shots', resource: 'brews' },
  'bean-purchases': { entityType: 'bean-purchases', resource: 'beans' },
  gear: { entityType: 'gear', resource: 'gear' },
  places: { entityType: 'coffee-shops', resource: 'places' },
  visits: { entityType: 'visits', resource: 'visits' },
} as const satisfies Record<
  string,
  { entityType: string; resource: IntegrationResource }
>

type ImageEntity = keyof typeof IMAGE_ENTITIES

/** The resource a picture call targets, from its `entityType` argument. */
export function imageCallResource(input: unknown): IntegrationResource | null {
  const entityType = (input as { entityType?: unknown } | null)?.entityType
  return typeof entityType === 'string' &&
    Object.hasOwn(IMAGE_ENTITIES, entityType)
    ? IMAGE_ENTITIES[entityType as ImageEntity].resource
    : null
}
const imageEntitySchema = z.enum(
  Object.keys(IMAGE_ENTITIES) as [ImageEntity, ...ImageEntity[]],
)

// Base64 grows bytes by a third.
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4

export const imageReadSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(500)
    .refine(
      (path) => !path.includes('..') && !path.startsWith('/'),
      'Use the storagePath of an image record',
    )
    .describe('The storagePath of an image record'),
  size: z.enum(['original', 'small', 'thumbnail']).default('original'),
})

export const imageUploadSchema = z.object({
  entityType: imageEntitySchema,
  entityId: positiveIdSchema,
  filename: imageFilenameSchema,
  mimeType: z.enum(IMAGE_MIME_TYPE_VALUES),
  data: z
    .string()
    .min(4)
    .max(MAX_BASE64_LENGTH)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Expected base64 without a data: prefix')
    .describe('Base64-encoded file content'),
})

export const imageDeleteSchema = z.object({
  entityType: imageEntitySchema,
  entityId: positiveIdSchema,
  imageId: positiveIdSchema,
})

export const imageThumbnailSchema = imageDeleteSchema.extend({
  entityType: z.enum(['bean-purchases', 'gear']),
})

/** Binary results: the API sends the bytes, MCP an image content block. */
export class IntegrationImage {
  constructor(
    readonly bytes: Uint8Array,
    readonly mimeType: string,
  ) {}
}

const MIME_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  heic: 'image/heic',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Row-level security limits the lookup to the owner's own pictures. */
async function imageResource(
  path: string,
): Promise<IntegrationResource | null> {
  const [row] = await db.execute<{ resource: IntegrationResource }>(sql`
    select 'beans' as resource from bean_images where storage_path = ${path}
    union all select 'gear' from gear_images where storage_path = ${path}
    union all select 'places' from coffee_shop_images where storage_path = ${path}
    union all select 'brews' from brew_images where storage_path = ${path}
    union all select 'visits' from cafe_visit_images where storage_path = ${path}
    limit 1
  `)
  return row?.resource ?? null
}

export async function readIntegrationImage(
  input: z.input<typeof imageReadSchema>,
  context: IntegrationContext,
) {
  const { path, size } = imageReadSchema.parse(input)
  const resource = await imageResource(path)
  if (!resource) throw new Error('Image not found')
  context.require(resource, 'read')
  const storagePath =
    size === 'thumbnail'
      ? getThumbnailPath(path)
      : size === 'small'
        ? getSmallThumbnailPath(path)
        : path
  const storage = getStorage()
  if (!(await storage.exists(storagePath))) throw new Error('Image not found')
  const blob = await storage.download(storagePath)
  const extension = storagePath.split('.').pop()?.toLowerCase() ?? ''
  return new IntegrationImage(
    new Uint8Array(await blob.arrayBuffer()),
    MIME_TYPES[extension] ?? 'application/octet-stream',
  )
}

export async function uploadIntegrationImage(
  input: z.input<typeof imageUploadSchema>,
  context: IntegrationContext,
) {
  const data = imageUploadSchema.parse(input)
  const target = IMAGE_ENTITIES[data.entityType]
  context.require(target.resource, 'write')
  let bytes: Uint8Array
  try {
    bytes = decodeBase64(data.data)
  } catch {
    throw new Error('The image data is not valid base64')
  }
  const file = new File([bytes as BlobPart], data.filename, {
    type: data.mimeType,
  })
  const image = await uploadEntityImage({
    data: createEntityImageUploadFormData(
      target.entityType,
      data.entityId,
      file,
    ),
  })
  // Storage URLs are for the browser; integrations download by storagePath.
  const { url: _url, ...record } = image as Record<string, unknown>
  return record
}

export async function setIntegrationImageThumbnail(
  input: z.input<typeof imageThumbnailSchema>,
  context: IntegrationContext,
) {
  const data = imageThumbnailSchema.parse(input)
  const target = IMAGE_ENTITIES[data.entityType]
  context.require(target.resource, 'write')
  return setImageAsThumbnail({
    data: { ...data, entityType: target.entityType },
  })
}

export async function deleteIntegrationImage(
  input: z.input<typeof imageDeleteSchema>,
  context: IntegrationContext,
) {
  const data = imageDeleteSchema.parse(input)
  const target = IMAGE_ENTITIES[data.entityType]
  context.require(target.resource, 'write')
  return deleteEntityImage({
    data: { ...data, entityType: target.entityType },
  })
}
