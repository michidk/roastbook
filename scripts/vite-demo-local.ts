import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Connect, Plugin } from 'vite'

export function demoLocalPlugin(): Plugin {
  return {
    name: 'roastbook-browser-demo',
    enforce: 'pre',
    async generateBundle() {
      for (const filename of await readdir('.demo-build/client'))
        this.emitFile({
          type: 'asset',
          fileName: `demo-local/${filename}`,
          source: await readFile(resolve('.demo-build/client', filename)),
        })
    },
    configureServer(server) {
      server.middlewares.use(
        '/demo-local',
        serveDemoAssets('.demo-build/client'),
      )
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        '/demo-local',
        serveDemoAssets('dist/client/demo-local'),
      )
    },
  }
}

function serveDemoAssets(directory: string): Connect.NextHandleFunction {
  return async (request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method ?? '')) return next()
    const filename = (request.url ?? '').split('?')[0]?.replace(/^\//, '')
    if (!filename || filename.includes('/') || filename.includes('..'))
      return next()
    try {
      const data = await readFile(resolve(directory, filename))
      response.setHeader(
        'Content-Type',
        filename.endsWith('.js')
          ? 'application/javascript'
          : filename.endsWith('.wasm')
            ? 'application/wasm'
            : filename.endsWith('.json')
              ? 'application/json'
              : 'application/octet-stream',
      )
      response.setHeader('Content-Length', data.byteLength)
      response.setHeader('Cache-Control', 'no-cache')
      response.end(request.method === 'HEAD' ? undefined : data)
    } catch {
      response.statusCode = 404
      response.end('Demo asset not found')
    }
  }
}
