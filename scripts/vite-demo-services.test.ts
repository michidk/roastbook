import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { demoServiceModule, isDemoServiceModule } from './vite-demo-services'

test('only unsuffixed server-function modules are replaced in the demo', () => {
  expect(isDemoServiceModule(resolve('src/lib/server/beans.ts'))).toBe(true)
  expect(isDemoServiceModule(resolve('src/lib/mcp/settings.ts'))).toBe(true)
  expect(
    isDemoServiceModule(resolve('src/lib/server/journal-snapshot.server.ts')),
  ).toBe(false)
  // Shared contracts without server functions still compile into the demo.
  expect(
    isDemoServiceModule(resolve('src/lib/server/settings-contract.ts')),
  ).toBe(false)
  expect(isDemoServiceModule(resolve('src/lib/image-url.ts'))).toBe(false)
})

test('every runtime export becomes a disabled demo function', () => {
  const code = demoServiceModule(resolve('src/lib/server/beans.ts'))
  expect(code).toContain(
    'export const getBeans = demoFunction("beans/getBeans")',
  )
  expect(code).toContain(
    'export const checkVisionEnabled = demoFunction("beans/checkVisionEnabled")',
  )
  expect(code).not.toContain('createServerFn')
})
