import { expect, test } from 'bun:test'
import { checkClientBoundaries } from './client-boundaries'

test('UI uses journal commands while typed read contracts remain available', () => {
  const path = 'src/components/recipes/recipe-form.tsx'
  expect(
    checkClientBoundaries(
      path,
      "import { createRecipe as save } from '@/lib/server/recipes'",
    ),
  ).toHaveLength(1)
  expect(
    checkClientBoundaries(
      path,
      "import { enqueueEntityUpdate } from '@/modules/offline/entity-operations'",
    ),
  ).toHaveLength(1)
  expect(
    checkClientBoundaries(
      path,
      "import * as recipes from '@/lib/server/recipes'",
    ),
  ).toHaveLength(1)
  expect(
    checkClientBoundaries(
      path,
      "import { type createRecipe, getRecipe } from '@/lib/server/recipes'",
    ),
  ).toEqual([])
  expect(
    checkClientBoundaries(
      path,
      "import { addRecipe } from '@/lib/client/journal'",
    ),
  ).toEqual([])
  expect(
    checkClientBoundaries(
      'src/lib/client/journal.ts',
      "import { createRecipe } from '@/lib/server/recipes'",
    ),
  ).toEqual([])
})
