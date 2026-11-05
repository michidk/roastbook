import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { demoServiceModule, isDemoServiceModule } from './vite-demo-services'

test('only unsuffixed server-function modules are replaced in the demo', () => {
  expect(isDemoServiceModule(resolve('src/lib/server/research.ts'))).toBe(true)
  expect(isDemoServiceModule(resolve('src/lib/server/journal-sync.ts'))).toBe(
    true,
  )
  expect(
    isDemoServiceModule(resolve('src/lib/server/journal-sync.server.ts')),
  ).toBe(false)
  // Journal functions run locally in the demo and are never replaced.
  expect(isDemoServiceModule(resolve('src/journal/beans.ts'))).toBe(false)
  expect(isDemoServiceModule(resolve('src/lib/image-url.ts'))).toBe(false)
})

test('every runtime export is routed through the local demo dispatcher', () => {
  const code = demoServiceModule(resolve('src/lib/server/research.ts'))
  expect(code).toContain(
    'export const extractBeanInfo = demoFunction("research/extractBeanInfo")',
  )
  expect(code).toContain(
    'export const checkVisionEnabled = demoFunction("research/checkVisionEnabled")',
  )
  expect(code).not.toContain('createServerFn')
})
