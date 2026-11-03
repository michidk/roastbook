import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Connect, Plugin } from 'vite'
import { serverFunctionNames } from './demo-local-build'

export function demoLocalPlugin(): Plugin {
  return {
    name: 'roastbook-browser-demo',
    enforce: 'pre',
    transform(source, id) {
      if (id.includes('/src/routes/api/') && !id.endsWith('/health.ts')) {
        const route = /createFileRoute\(('(?:[^'\\]|\\.)*')\)/.exec(source)?.[1]
        if (!route) throw new Error(`Missing API route declaration: ${id}`)
        return `import { createFileRoute } from '@tanstack/react-router';
          import { demoModeReadOnlyResponse } from '@/lib/server/demo-mode.server';
          export const Route = createFileRoute(${route})({ server: { handlers: {
            GET: demoModeReadOnlyResponse, POST: demoModeReadOnlyResponse,
            PUT: demoModeReadOnlyResponse, PATCH: demoModeReadOnlyResponse,
            DELETE: demoModeReadOnlyResponse,
          } } })`
      }
      if (
        (!id.includes('/src/lib/server/') &&
          !id.includes('/src/lib/mcp/settings.ts')) ||
        id.includes('.server.')
      )
        return
      const functions = serverFunctionNames(source)
      if (!functions.length) return
      const module = id.includes('/src/lib/mcp/settings.ts')
        ? 'mcp/settings'
        : id
            .slice(id.indexOf('/src/lib/server/') + '/src/lib/server/'.length)
            .replace(/\.ts(?:\?.*)?$/, '')
      return rpcExports(module, functions)
    },
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
        serveDemoAssets('.vercel/output/static/demo-local'),
      )
    },
  }
}

function rpcExports(module: string, functions: string[]) {
  return `import { demoFunction } from '@/lib/demo/local/client';\n${functions.map((name) => `export const ${name} = demoFunction(${JSON.stringify(`${module}/${name}`)})`).join('\n')}`
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
