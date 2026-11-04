import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  BUILD_ID_PLACEHOLDER,
  createServiceWorkerBuildId,
  createServiceWorkerSource,
  readClientAssetNames,
  readServiceWorkerTemplate,
} from './service-worker-build'

const outputDirs = process.argv.slice(2)
if (outputDirs.length === 0) {
  throw new Error(
    'Usage: bun run scripts/build-service-worker.ts <static-output-dir> [...]',
  )
}

const template = await readServiceWorkerTemplate()
if (!template.includes(BUILD_ID_PLACEHOLDER)) {
  throw new Error(
    `public/sw.js is missing the ${BUILD_ID_PLACEHOLDER} placeholder`,
  )
}

for (const directory of outputDirs) {
  if (!existsSync(directory)) {
    throw new Error(`Static output directory does not exist: ${directory}`)
  }

  if (!existsSync(join(directory, 'offline-shell.html')))
    throw new Error(
      'The public offline shell was not generated. Fix prerender errors before publishing.',
    )
  const clientAssets = await readClientAssetNames(directory)
  const directoryBuildId = await createServiceWorkerBuildId(
    template,
    clientAssets,
  )
  const directoryServiceWorker = createServiceWorkerSource(
    template,
    directoryBuildId,
    clientAssets,
  )
  const target = join(directory, 'sw.js')
  await writeFile(target, directoryServiceWorker)
  console.log(`Generated ${target} (build ${directoryBuildId})`)
}
