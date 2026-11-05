import { createHash } from 'node:crypto'
import { buildGenerator, programFromConfig } from 'typescript-json-schema'
import type { IntegrationResponseSchemas } from '@/lib/server/integrations/response-contract'

const program = programFromConfig('tsconfig.json', [
  'src/lib/server/integrations/response-contract.ts',
])
const generator = buildGenerator(program, { required: true })
if (!generator) throw new Error('Could not build response schemas')
const schema = generator.getSchemaForSymbol('IntegrationResponseSchemas')
function property(name: keyof IntegrationResponseSchemas) {
  const value = schema.properties?.[name]
  if (!value || typeof value === 'boolean')
    throw new Error(`Missing response schema for ${name}`)
  return value
}
const operationsRef = property('operations').$ref
if (!operationsRef) throw new Error('Missing operations schema reference')
const operationsName = decodeURIComponent(
  operationsRef.replace('#/definitions/', ''),
)
const definitions = { ...schema.definitions }
const operations = definitions[operationsName]
if (!operations || typeof operations === 'boolean' || !operations.properties)
  throw new Error('Missing operation response schemas')
delete definitions[operationsName]

// Anonymous compiler type names can be thousands of characters long. Replace
// them with stable identifiers permitted in OpenAPI component names.
const names = new Map(
  Object.keys(definitions).map((name) => [
    name,
    `Response_${createHash('sha256').update(name).digest('hex').slice(0, 16)}`,
  ]),
)
const operationNames = new Set<string>()
function nameResponse(value: unknown, name: string) {
  if (!value || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && typeof item === 'string') {
      const source = decodeURIComponent(item.replace('#/definitions/', ''))
      if (!operationNames.has(source)) {
        names.set(
          source,
          [...names.values()].includes(name)
            ? `${name}_${operationNames.size}`
            : name,
        )
        operationNames.add(source)
      }
    } else if (key === 'anyOf' && Array.isArray(item)) {
      for (const member of item) nameResponse(member, name)
    }
  }
}
for (const [operation, response] of Object.entries(operations.properties)) {
  const name = operation.replace(
    /(^|_)([a-z])/g,
    (_, _prefix, letter: string) => letter.toUpperCase(),
  )
  nameResponse(response, `${name}Data`)
}
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (key === '$ref' && typeof item === 'string') {
        const name = decodeURIComponent(item.replace('#/definitions/', ''))
        const target = names.get(name)
        if (!target) throw new Error(`Unresolved response schema ${name}`)
        return [key, `#/components/schemas/${target}`]
      }
      return [names.get(key) ?? key, normalize(item)]
    }),
  )
}
const document = normalize({
  operations: operations.properties,
  rateLimit: property('rateLimit'),
  definitions,
})
const file = 'src/lib/server/integrations/response-schemas.gen.json'
const formatter = Bun.spawn(
  ['bun', 'x', '--no-install', 'biome', 'format', '--stdin-file-path', file],
  {
    stdin: new Blob([JSON.stringify(document)]),
    stdout: 'pipe',
    stderr: 'pipe',
  },
)
const [output, diagnostics, exitCode] = await Promise.all([
  new Response(formatter.stdout).text(),
  new Response(formatter.stderr).text(),
  formatter.exited,
])
if (exitCode !== 0) throw new Error(diagnostics)
if (process.argv.includes('--check')) {
  if ((await Bun.file(file).text()) !== output)
    throw new Error(
      'Response schemas are stale. Run bun run generate:api-responses',
    )
} else await Bun.write(file, output)
