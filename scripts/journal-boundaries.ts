import { dirname, relative, resolve } from 'node:path'
import { parse } from '@babel/parser'

/** Resolve both aliases and relative imports before checking package ownership. */
export function checkJournalImports(path: string, source: string): string[] {
  const file = parse(source, {
    sourceType: 'module',
    plugins: path.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript'],
  })
  const failures: string[] = []
  const shared = /^packages\/journal-(?:client|domain)\//.test(path)
  const targets: string[] = []
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    const type: unknown = Reflect.get(value, 'type')
    if (
      [
        'ImportDeclaration',
        'ExportNamedDeclaration',
        'ExportAllDeclaration',
        'ImportExpression',
      ].includes(String(type))
    ) {
      const source: unknown = Reflect.get(value, 'source')
      if (source && typeof source === 'object') {
        const target: unknown = Reflect.get(source, 'value')
        if (typeof target === 'string') targets.push(target)
      }
    }
    Object.values(value).forEach(visit)
  }
  visit(file.program)
  for (const target of targets) {
    if (!target) continue
    const resolved = target.startsWith('@/')
      ? `src/${target.slice(2)}`
      : target.startsWith('.')
        ? relative('.', resolve(dirname(path), target))
        : target
    const demo =
      resolved.startsWith('@roastbook/journal-demo') ||
      resolved.startsWith('packages/journal-demo/')
    if (path.startsWith('src/') && !/\.test\./.test(path) && demo)
      failures.push(
        `${path} must select its edition at the application entry point, not import ${target}`,
      )
    if (
      shared &&
      (resolved.startsWith('src/') ||
        demo ||
        /(?:\.server|drizzle-orm|@tanstack\/react-start|node:)/.test(resolved))
    )
      failures.push(
        `${path} must not import application or server implementation ${target}`,
      )
  }
  return failures
}

/** Check actual emitted chunks, including imports resolved through package exports. */
export function checkProductModule(id: string): string | undefined {
  if (
    /(?:\/packages\/journal-demo\/|\/src\/db\/demo(?:-seed\.server)?\.ts|\/@electric-sql\/pglite\/)/.test(
      id.replaceAll('\\', '/'),
    )
  )
    return `Product output contains a demo-only module: ${id}`
}

/** Browser chunks in either edition must never contain a server implementation. */
export function checkBrowserModule(
  id: string,
  demo = false,
): string | undefined {
  const path = id.replaceAll('\\', '/')
  if (demo && /\/(?:better-auth|@better-auth)\//.test(path))
    return `Demo browser output contains authentication code: ${id}`
  if (
    /(?:\/src\/(?:db\/|cloudflare\/)|\.server\.[cm]?[jt]s|\/@electric-sql\/pglite\/|\/(?:postgres|drizzle-orm|nodemailer)\/|\/@aws-sdk\/)/.test(
      path,
    )
  )
    return `Browser output contains a server-only module: ${id}`
}
