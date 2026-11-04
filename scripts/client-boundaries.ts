import { parse } from '@babel/parser'

const journalMutations = new Set([
  'createShot',
  'createShotAndSaveRecipe',
  'updateShot',
  'deleteShot',
  'createRecipe',
  'updateRecipe',
  'deleteRecipe',
  'duplicateRecipe',
  'saveShotAsRecipe',
])
const queuedWrites = new Set([
  'enqueuePendingBrew',
  'enqueueEntityUpdate',
  'enqueueEntityDelete',
  'enqueueRecipeCreate',
  'enqueueSavedBrewToRecipe',
  'enqueueBrewSaveToRecipe',
  'enqueueImageUpload',
  'enqueueImageDelete',
  'putOperation',
  'putPendingBrew',
])

export function checkClientBoundaries(path: string, source: string): string[] {
  if (
    !/src\/(?:components|hooks|routes)\//.test(path) ||
    /\.(?:test|stories)\./.test(path)
  )
    return []
  const file = parse(source, {
    sourceType: 'module',
    plugins: path.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript'],
  })
  const failures: string[] = []
  for (const node of file.program.body) {
    if (node.type !== 'ImportDeclaration' || node.importKind === 'type')
      continue
    const target = node.source.value
    const serverJournal = /(?:lib\/server\/)?(?:shots|recipes)$/.test(target)
    const offline = target.includes('modules/offline/')
    if (!serverJournal && !offline) continue
    for (const element of node.specifiers) {
      if (element.type !== 'ImportSpecifier') {
        failures.push(
          `${path} must use named imports from ${target} so journal boundaries can be checked`,
        )
        continue
      }
      if (element.importKind === 'type') continue
      const name =
        element.imported.type === 'Identifier'
          ? element.imported.name
          : element.imported.value
      if (
        (serverJournal && journalMutations.has(name)) ||
        (offline && queuedWrites.has(name))
      )
        failures.push(
          `${path} must use @/lib/client/journal instead of importing ${name} from ${target}`,
        )
    }
  }
  return failures
}
