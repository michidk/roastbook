import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const directory = process.argv[2]
if (!directory)
  throw new Error(
    'Usage: bun run scripts/build-demo-pwa.ts <static-output-dir>',
  )

// Replace previously published workers so returning demo visitors also lose offline control.
await writeFile(
  join(directory, 'sw.js'),
  `self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name.startsWith('roastbook-')).map((name) => caches.delete(name)))
    await self.registration.unregister()
    await self.clients.claim()
  })())
})
`,
)
await Promise.all(
  ['manifest.json', 'offline.html'].map((name) =>
    rm(join(directory, name), { force: true }),
  ),
)
console.log('Demo installation and offline assets disabled')
