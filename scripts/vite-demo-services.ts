import { readFileSync } from 'node:fs'
import { basename, relative, resolve } from 'node:path'
import { type Plugin, parseSync } from 'vite'

const prefix = '\0roastbook-demo-service:'
const functions = resolve('packages/journal-demo/src/functions.ts')

/** Server-function modules: unsuffixed files that define `createServerFn`. */
export function isDemoServiceModule(id: string): boolean {
  const path = relative(resolve('src/lib'), id)
  return (
    /^(?:server|mcp)\/[a-z0-9-]+\.ts$/.test(path) &&
    readFileSync(id, 'utf8').includes('createServerFn')
  )
}

/** The demo edition never calls server functions; every export fails cleanly. */
export function demoServiceModule(id: string): string {
  const name = basename(id, '.ts')
  const exports = parseSync(id, readFileSync(id, 'utf8'))
    .module.staticExports.flatMap((statement) => statement.entries)
    .filter((entry) => !entry.isType && entry.exportName.name)
    .map((entry) => entry.exportName.name)
  return [
    `import { demoFunction } from ${JSON.stringify(functions)}`,
    ...exports.map(
      (exported) =>
        `export const ${exported} = demoFunction(${JSON.stringify(`${name}/${exported}`)})`,
    ),
  ].join('\n')
}

export function demoServices(): Plugin {
  return {
    name: 'roastbook-demo-services',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source.startsWith(prefix)) return source
      const candidate =
        /(?:^|\/)(?:server|mcp)\/[a-z0-9-]+$/.test(source) ||
        (source.startsWith('.') &&
          /\/src\/lib\/(?:server|mcp)\//.test(importer ?? ''))
      if (!candidate) return null
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      })
      return resolved && isDemoServiceModule(resolved.id)
        ? `${prefix}${resolved.id}`
        : null
    },
    load(id) {
      return id.startsWith(prefix)
        ? demoServiceModule(id.slice(prefix.length))
        : null
    },
  }
}
