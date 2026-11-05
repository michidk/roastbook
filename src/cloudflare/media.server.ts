import '@tanstack/react-start/server-only'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { owned } from '@/db/journal-scope.server'
import {
  beanImages,
  cafeVisitImages,
  coffeeShopImages,
  coffeeShops,
  gearImages,
  roasters,
  shotImages,
} from '@/db/schema'
import { handleJournalRequest } from '@/lib/server/auth/request.server'
import { validateObjectKey } from '@/cloudflare/r2'
import { requireCloudflareRuntime } from './context.server'

const CONTENT_TYPES: Record<string, string> = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  ico: 'image/x-icon',
}

async function ownsImage(path: string) {
  if (path.startsWith('favicons/')) {
    const match = /^favicons\/(coffee-shops|roasters)\/([1-9]\d*)\.png$/.exec(
      path,
    )
    if (!match) return false
    const id = Number(match[2])
    if (!Number.isSafeInteger(id)) return false
    const table = match[1] === 'coffee-shops' ? coffeeShops : roasters
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(owned(table, eq(table.id, id)))
      .limit(1)
    return rows.length > 0
  }
  const original = path.replace(/\.(?:thumb|small)\.webp$/, '.webp')
  const rows = await Promise.all([
    db
      .select({ id: beanImages.id })
      .from(beanImages)
      .where(
        owned(beanImages, inArray(beanImages.storagePath, [path, original])),
      )
      .limit(1),
    db
      .select({ id: gearImages.id })
      .from(gearImages)
      .where(
        owned(gearImages, inArray(gearImages.storagePath, [path, original])),
      )
      .limit(1),
    db
      .select({ id: coffeeShopImages.id })
      .from(coffeeShopImages)
      .where(
        owned(
          coffeeShopImages,
          inArray(coffeeShopImages.storagePath, [path, original]),
        ),
      )
      .limit(1),
    db
      .select({ id: shotImages.id })
      .from(shotImages)
      .where(
        owned(shotImages, inArray(shotImages.storagePath, [path, original])),
      )
      .limit(1),
    db
      .select({ id: cafeVisitImages.id })
      .from(cafeVisitImages)
      .where(
        owned(
          cafeVisitImages,
          inArray(cafeVisitImages.storagePath, [path, original]),
        ),
      )
      .limit(1),
  ])
  return rows.some((row) => row.length > 0)
}

export function handleCloudflareMedia(request: Request): Promise<Response> {
  return handleJournalRequest(request, async () => {
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      })
    const url = new URL(request.url)
    let paths: string[]
    try {
      const requested = url.pathname
        .slice('/media/'.length)
        .split('/')
        .map(decodeURIComponent)
        .join('/')
      const fallback = url.searchParams.get('fallback')
      paths = (fallback ? [requested, fallback] : [requested]).map(
        validateObjectKey,
      )
    } catch {
      return new Response('Bad request', { status: 400 })
    }
    const bucket = requireCloudflareRuntime().bindings.MEDIA
    for (const path of paths) {
      // Authorize every candidate before accessing private object storage.
      if (!(await ownsImage(path))) continue
      const object = await bucket.get(path)
      if (!object) continue
      const type = CONTENT_TYPES[path.split('.').pop()?.toLowerCase() ?? '']
      if (!type) return new Response('Not found', { status: 404 })
      const reader = object.body.getReader()
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const chunk = await reader.read()
          if (chunk.done) controller.close()
          else controller.enqueue(chunk.value)
        },
        async cancel(reason) {
          await reader.cancel(reason)
        },
      })
      return new Response(request.method === 'HEAD' ? null : body, {
        headers: {
          'Content-Type': type,
          'Content-Length': String(object.size),
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          Vary: 'Cookie, Authorization',
        },
      })
    }
    return new Response('Not found', { status: 404 })
  })
}
