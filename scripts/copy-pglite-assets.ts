import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourceDirectory = resolve('node_modules/@electric-sql/pglite/dist')
const targetDirectory = resolve('.vercel/output/functions/__server.func/_libs')

await mkdir(targetDirectory, { recursive: true })
await Promise.all([
  ...['pglite.data', 'pglite.wasm', 'initdb.wasm'].map((filename) =>
    copyFile(
      resolve(sourceDirectory, filename),
      resolve(targetDirectory, filename),
    ),
  ),
  copyFile(
    resolve('.demo-build/demo-db.tar.gz'),
    resolve(targetDirectory, 'demo-db.tar.gz'),
  ),
])
