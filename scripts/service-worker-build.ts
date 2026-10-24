import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const SOURCE_SERVICE_WORKER = 'public/sw.js'
export const BUILD_ID_PLACEHOLDER = '__BUILD_ID__'
export const ASSET_LIST_PLACEHOLDER = '__PRECACHE_ASSETS__'
export const MAX_PRECACHE_ASSET_BYTES = 2 * 1024 * 1024
export const PRECACHED_FILES = [
  'offline.html',
  'manifest.json',
  'logo192.png',
  'logo512.png',
  'logo-maskable-192.png',
  'logo-maskable-512.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'navbar-logo.png',
  'paper-grain-light.svg',
  'paper-grain-dark.svg',
  'coffee-stains-light.svg',
  'coffee-stains-dark.svg',
]

export async function readServiceWorkerTemplate(): Promise<string> {
  return readFile(SOURCE_SERVICE_WORKER, 'utf8')
}

export async function readClientAssetNames(
  directory: string,
): Promise<string[]> {
  const assetsDirectory = join(directory, 'assets')
  if (!existsSync(assetsDirectory)) {
    throw new Error(
      `Client assets directory does not exist: ${assetsDirectory}`,
    )
  }

  const entries = await readdir(assetsDirectory, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()
}

export async function createServiceWorkerBuildId(
  template: string,
  clientAssets: readonly string[] = [],
): Promise<string> {
  const hash = createHash('sha256').update(template)
  for (const file of PRECACHED_FILES) {
    hash.update(file)
    hash.update(await readFile(join('public', file)))
  }
  for (const asset of clientAssets) {
    hash.update(`asset:${asset}`)
  }
  return hash.digest('hex').slice(0, 12)
}

export function createServiceWorkerSource(
  template: string,
  buildId: string,
  clientAssets: readonly string[] = [],
): string {
  return template
    .replaceAll(BUILD_ID_PLACEHOLDER, buildId)
    .replaceAll(
      ASSET_LIST_PLACEHOLDER,
      JSON.stringify(clientAssets.map((asset) => `/assets/${asset}`)),
    )
}
