import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import type { Plugin } from 'vite'

async function loadDemoAssets() {
  const assets = new Map<string, Uint8Array>()
  for (const filename of [
    'kraft-orange.webp',
    'forest-botanical.webp',
    'cobalt-sunburst.webp',
    'plum-orbit.webp',
    'teal-contours.webp',
  ]) {
    const source = await readFile(
      resolve('scripts/seed-assets/bean-packaging', filename),
    )
    assets.set(`media/demo/${filename}`, source)
    assets.set(`media/demo/${filename.replace('.webp', '.thumb.webp')}`, source)
    assets.set(
      `media/demo/${filename.replace('.webp', '.small.webp')}`,
      await sharp(source)
        .resize({ width: 128, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer(),
    )
  }
  for (const filename of [
    'terracotta-wave.webp',
    'cobalt-arches.webp',
    'forest-diamond.webp',
    'plum-crescent.webp',
    'coral-pinwheel.webp',
  ]) {
    assets.set(
      `media/demo-favicons/${filename}`,
      await readFile(resolve('scripts/seed-assets/demo-favicons', filename)),
    )
  }
  return assets
}

export function demoAssets(): Plugin {
  let assets: ReturnType<typeof loadDemoAssets> | undefined
  const load = () => (assets ??= loadDemoAssets())
  return {
    name: 'roastbook-demo-assets',
    async generateBundle() {
      for (const [fileName, source] of await load())
        this.emitFile({ type: 'asset', fileName, source })
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!['GET', 'HEAD'].includes(request.method ?? '')) return next()
        const path = (request.url ?? '').split('?')[0]?.slice(1)
        if (!path?.startsWith('media/')) return next()
        const asset = (await load()).get(path)
        if (!asset) return next()
        response.setHeader('Content-Type', 'image/webp')
        response.setHeader('Content-Length', asset.byteLength)
        response.end(request.method === 'HEAD' ? undefined : asset)
      })
    },
  }
}
