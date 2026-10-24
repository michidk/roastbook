import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { z } from 'zod'
import {
  BUILD_ID_PLACEHOLDER,
  createServiceWorkerBuildId,
  MAX_PRECACHE_ASSET_BYTES,
  PRECACHED_FILES,
  readClientAssetNames,
  readServiceWorkerTemplate,
} from './service-worker-build'

const DEFAULT_OUTPUT_DIR = '.output/public'
const REQUIRED_ICON_SIZES = ['192x192', '512x512'] as const
const REQUIRED_ICON_PURPOSES = ['any', 'maskable'] as const
const REQUIRED_BUILD_FILES = ['sw.js', ...PRECACHED_FILES]
const MAX_SERVICE_WORKER_BYTES = 20 * 1024
const ICON_PURPOSES = new Set(['any', 'maskable', 'monochrome'])

const iconPurposeSchema = z.string().refine(
  (value) => {
    const tokens = value.trim().split(/\s+/)
    return (
      tokens.length > 0 && tokens.every((token) => ICON_PURPOSES.has(token))
    )
  },
  { message: 'purpose must contain any, maskable, or monochrome tokens' },
)

const iconSchema = z.object({
  src: z.string().regex(/^\//),
  sizes: z.string().regex(/^\d+x\d+$/),
  type: z.literal('image/png'),
  purpose: iconPurposeSchema,
})

const manifestSchema = z.object({
  id: z.string().regex(/^\//),
  name: z.string().min(1),
  short_name: z.string().min(1),
  description: z.string().min(1),
  lang: z.string().min(1),
  start_url: z.string().regex(/^\//),
  scope: z.string().regex(/^\//),
  display: z.literal('standalone'),
  background_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  theme_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icons: z.array(iconSchema).min(2),
})

type Manifest = z.infer<typeof manifestSchema>
type ManifestIcon = z.infer<typeof iconSchema>

const failures: string[] = []

function record(condition: boolean, message: string) {
  if (!condition) failures.push(message)
}

function parseIconSize(
  sizes: string,
): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(sizes)
  if (!match) return null
  const [, widthText, heightText] = match
  if (!widthText || !heightText) return null
  return { width: Number(widthText), height: Number(heightText) }
}

function hasIconPurpose(icon: ManifestIcon, purpose: string): boolean {
  return icon.purpose.trim().split(/\s+/).includes(purpose)
}

const manifestText = await readFile('public/manifest.json', 'utf8')
const manifest: Manifest = manifestSchema.parse(JSON.parse(manifestText))

record(
  manifest.start_url === '/overview',
  'public/manifest.json must start at /overview',
)
record(manifest.scope === '/', 'public/manifest.json must scope the root URL')
record(manifest.id === '/', 'public/manifest.json must use / as its identity')

for (const purpose of REQUIRED_ICON_PURPOSES) {
  for (const sizes of REQUIRED_ICON_SIZES) {
    record(
      manifest.icons.some(
        (icon) => hasIconPurpose(icon, purpose) && icon.sizes === sizes,
      ),
      `public/manifest.json is missing a ${sizes} ${purpose} icon`,
    )
  }
}

for (const icon of manifest.icons) {
  const iconPath = join('public', icon.src.slice(1))
  if (!existsSync(iconPath)) {
    failures.push(`${iconPath} does not exist`)
    continue
  }

  const dimensions = parseIconSize(icon.sizes)
  if (!dimensions) {
    failures.push(`Cannot parse ${icon.sizes} for ${icon.src}`)
    continue
  }

  const metadata = await sharp(iconPath)
    .metadata()
    .catch((error) => {
      failures.push(
        `${iconPath} could not be decoded: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return undefined
    })
  if (!metadata) continue
  record(
    metadata.format === 'png',
    `${iconPath} is ${metadata.format}, expected png`,
  )
  record(
    metadata.width === dimensions.width &&
      metadata.height === dimensions.height,
    `${iconPath} is ${metadata.width}x${metadata.height}, expected ${icon.sizes}`,
  )
}

const offlinePath = 'public/offline.html'
if (!existsSync(offlinePath)) {
  failures.push(`${offlinePath} does not exist`)
} else {
  const offlinePage = await readFile(offlinePath, 'utf8')
  record(
    offlinePage.includes('<title>Offline | Roastbook</title>'),
    `${offlinePath} must have the Roastbook offline title`,
  )
  record(
    !/(?:https?:)?\/\//i.test(offlinePage),
    `${offlinePath} must not depend on external or protocol-relative URLs`,
  )
}

const serviceWorkerPath = 'public/sw.js'
let serviceWorkerTemplate: string | null = null
if (!existsSync(serviceWorkerPath)) {
  failures.push(`${serviceWorkerPath} does not exist`)
} else {
  serviceWorkerTemplate = await readServiceWorkerTemplate()
  record(
    serviceWorkerTemplate.includes(BUILD_ID_PLACEHOLDER),
    `${serviceWorkerPath} is missing the ${BUILD_ID_PLACEHOLDER} placeholder`,
  )
}

const outputDirs = process.argv.slice(2)
if (outputDirs.length === 0) outputDirs.push(DEFAULT_OUTPUT_DIR)

for (const directory of outputDirs) {
  if (!existsSync(directory)) {
    failures.push(
      `${directory} does not exist. Run the matching build before checking it.`,
    )
    continue
  }

  for (const file of new Set([
    ...REQUIRED_BUILD_FILES,
    ...manifest.icons.map((icon) => icon.src.slice(1)),
  ])) {
    record(existsSync(join(directory, file)), `${directory}/${file} is missing`)
  }

  const expectedBuildId = serviceWorkerTemplate
    ? await createServiceWorkerBuildId(
        serviceWorkerTemplate,
        await readClientAssetNames(directory),
      )
    : null

  for (const asset of await readClientAssetNames(directory)) {
    const assetPath = join(directory, 'assets', asset)
    const size = (await stat(assetPath)).size
    record(
      size <= MAX_PRECACHE_ASSET_BYTES,
      `${assetPath} is ${size} bytes, above the offline precache limit of ${MAX_PRECACHE_ASSET_BYTES}`,
    )
  }

  const builtManifestPath = join(directory, 'manifest.json')
  if (existsSync(builtManifestPath)) {
    record(
      (await readFile(builtManifestPath, 'utf8')) === manifestText,
      `${builtManifestPath} does not match public/manifest.json`,
    )
  }

  const builtServiceWorkerPath = join(directory, 'sw.js')
  if (existsSync(builtServiceWorkerPath)) {
    const builtServiceWorker = await readFile(builtServiceWorkerPath, 'utf8')
    record(
      !builtServiceWorker.includes(BUILD_ID_PLACEHOLDER),
      `${builtServiceWorkerPath} still contains the build placeholder`,
    )
    if (expectedBuildId) {
      record(
        builtServiceWorker.includes(`const BUILD_ID = '${expectedBuildId}'`),
        `${builtServiceWorkerPath} does not match the expected build ID ${expectedBuildId}`,
      )
    }
    record(
      Buffer.byteLength(builtServiceWorker) <= MAX_SERVICE_WORKER_BYTES,
      `${builtServiceWorkerPath} exceeds ${MAX_SERVICE_WORKER_BYTES} bytes`,
    )
  }
}

if (failures.length > 0) {
  throw new Error(`PWA verification failed:\n${failures.join('\n')}`)
}

console.log(
  `PWA assets verified (${manifest.icons.length} icons, ${outputDirs.length} build output(s))`,
)
