import assert from 'node:assert/strict'
import { count, eq } from 'drizzle-orm'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { db } from '@/db'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { journalInsertValues, owned } from '@/db/journal-scope.server'
import {
  beanPurchases,
  beans,
  brewingMethods,
  clientOperations,
  gear,
  mediaCleanupJobs,
  recipes,
  replicationChanges,
  settings,
  shotImages,
  shots,
  tasteTags,
} from '@/db/schema'
import { pullRecipes } from '@/lib/server/replication-pull'
import { pushRecipes } from '@/lib/server/replication-push'
import { toDocument } from '@/lib/server/replication-shared'
import { createShotAndSaveRecipeSchema } from '@/lib/server/shot-list-contract.server'
import { saveShotToRecipe } from '@/lib/server/shot-recipes.server'
import {
  createShotAndSaveRecipeOperation,
  createShotOperation,
  deleteShotOperation,
  getShotOperation,
  updateShotOperation,
} from '@/lib/server/shots-operations.server'
import { shotCreateSchema, shotUpdateSchema } from '@/lib/server-validation'
import { SHOT_PARAMETER_KEYS } from '@/lib/shot-parameters'

export async function fixture(bindings: CloudflareRuntimeBindings) {
  const ownerId = crypto.randomUUID()
  const identity: JournalIdentity = {
    id: ownerId,
    email: `${ownerId}@example.test`,
    role: 'user',
    authentication: true,
    authenticatedAt: new Date(),
  }
  await bindings.DB.prepare(
    'insert into auth_users (id,email,email_verified) values (?,?,1)',
  )
    .bind(ownerId, identity.email)
    .run()
  const run = <Result>(work: () => Promise<Result>) =>
    withJournal(identity, work)
  const values = await run(async () => {
    await db.insert(settings).values(journalInsertValues({}))
    const [method] = await db
      .insert(brewingMethods)
      .values(
        journalInsertValues({
          name: 'Espresso',
          enabledParameters: [...SHOT_PARAMETER_KEYS],
        }),
      )
      .returning()
    const [bean] = await db
      .insert(beans)
      .values(journalInsertValues({ name: 'Coffee' }))
      .returning()
    if (!method || !bean)
      throw new Error('Journal fixture did not create its parent rows')
    const [purchase] = await db
      .insert(beanPurchases)
      .values(
        journalInsertValues({
          beanId: bean.id,
          initialWeightGrams: '250',
          price: '20',
        }),
      )
      .returning()
    if (!purchase) throw new Error('Journal fixture did not create a bag')
    return { methodId: method.id, beanId: bean.id, purchaseId: purchase.id }
  })
  return { ownerId, identity, run, ...values }
}

function shotInput(
  journal: Awaited<ReturnType<typeof fixture>>,
  extra: object = {},
) {
  return shotCreateSchema.parse({
    brewingMethodId: journal.methodId,
    beanId: journal.beanId,
    beanPurchaseId: journal.purchaseId,
    doseGrams: '18',
    yieldGrams: '36',
    ...extra,
  })
}

async function brewAndRecipe(bindings: CloudflareRuntimeBindings) {
  const journal = await fixture(bindings)
  await journal.run(async () => {
    const created = await createShotOperation(shotInput(journal))
    assert.equal(created.doseGrams, '18.00')
    const updated = await updateShotOperation(
      shotUpdateSchema.parse({
        ...shotInput(journal),
        id: created.id,
        baseRevision: created.revision,
        doseGrams: '19',
      }),
    )
    assert.equal(updated.doseGrams, '19.00')
    assert.equal(updated.revision, created.revision + 1)
    const both = await createShotAndSaveRecipeOperation(
      createShotAndSaveRecipeSchema.parse({
        shot: shotInput(journal),
        target: { name: 'Shared recipe' },
      }),
    )
    assert.equal(both.shot.beanPurchaseId, journal.purchaseId)
    assert.equal(both.recipe?.doseGrams, '18.00')
    if (!both.recipe) throw new Error('Recipe was not created')
    const overwritten = await saveShotToRecipe(updated.id, {
      recipeId: both.recipe.id,
    })
    assert.equal(overwritten.doseGrams, '19.00')
    const initial = await pullRecipes({})
    assert(
      initial.documents.some(
        (document) =>
          document.serverId === overwritten.id &&
          document.serverRevision === overwritten.revision,
      ),
    )
  })
}

async function largeRelations(bindings: CloudflareRuntimeBindings) {
  const journal = await fixture(bindings)
  await journal.run(async () => {
    const accessoryIds: number[] = []
    const tagIds: number[] = []
    for (let offset = 0; offset < 100; offset += 5) {
      const accessories = await db
        .insert(gear)
        .values(
          journalInsertValues(
            Array.from({ length: 5 }, (_, index) => ({
              name: `Accessory ${offset + index}`,
              type: 'tamper' as const,
            })),
          ),
        )
        .returning({ id: gear.id })
      const tags = await db
        .insert(tasteTags)
        .values(
          journalInsertValues(
            Array.from({ length: 5 }, (_, index) => ({
              name: `Flavor ${offset + index}`,
            })),
          ),
        )
        .returning({ id: tasteTags.id })
      accessoryIds.push(...accessories.map((row) => row.id))
      tagIds.push(...tags.map((row) => row.id))
    }
    const brew = await createShotOperation(
      shotInput(journal, {
        accessoryGearIds: accessoryIds,
        tasteTagIds: tagIds,
      }),
    )
    const saved = await getShotOperation(brew.id)
    assert.equal(saved?.accessoryGearIds.length, 100)
    assert.equal(saved?.tasteTags.length, 100)
    const recipe = await saveShotToRecipe(brew.id, { name: 'Full setup' })
    const savedRecipe = await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.id, recipe.id)),
      with: { accessoryGearLinks: true },
    })
    assert.equal(savedRecipe?.accessoryGearLinks.length, 100)
  })
}

async function ownershipRollback(bindings: CloudflareRuntimeBindings) {
  const alice = await fixture(bindings)
  const bob = await fixture(bindings)
  const privateGear = await bob.run(async () => {
    const [row] = await db
      .insert(gear)
      .values(
        journalInsertValues<typeof gear.$inferInsert>({
          name: 'Private',
          type: 'tamper',
        }),
      )
      .returning()
    if (!row) throw new Error('Missing private gear fixture')
    return row
  })
  await alice.run(async () => {
    const operationId = crypto.randomUUID()
    await assert.rejects(
      createShotOperation(
        shotInput(alice, {
          accessoryGearIds: [privateGear.id],
          clientOperationId: operationId,
        }),
      ),
      /FOREIGN KEY/,
    )
    assert.equal(
      (await db.select({ value: count() }).from(shots).where(owned(shots)))[0]
        ?.value,
      0,
    )
    assert.equal(
      (
        await db
          .select({ value: count() })
          .from(clientOperations)
          .where(owned(clientOperations))
      )[0]?.value,
      0,
    )
    const brew = await createShotOperation(shotInput(alice))
    await assert.rejects(
      updateShotOperation(
        shotUpdateSchema.parse({
          ...shotInput(alice),
          id: brew.id,
          baseRevision: brew.revision,
          doseGrams: '99',
          accessoryGearIds: [privateGear.id],
        }),
      ),
      /FOREIGN KEY/,
    )
    const unchanged = await getShotOperation(brew.id)
    assert.equal(unchanged?.revision, brew.revision)
    assert.equal(unchanged?.doseGrams, '18.00')
    const countBefore = (
      await db.select({ value: count() }).from(shots).where(owned(shots))
    )[0]?.value
    await assert.rejects(
      createShotAndSaveRecipeOperation(
        createShotAndSaveRecipeSchema.parse({
          shot: shotInput(alice),
          target: { recipeId: 2_147_483_647 },
        }),
      ),
      /not found/i,
    )
    assert.equal(
      (await db.select({ value: count() }).from(shots).where(owned(shots)))[0]
        ?.value,
      countBefore,
    )
  })
}

async function concurrentIdempotency(bindings: CloudflareRuntimeBindings) {
  const journal = await fixture(bindings)
  const operationId = crypto.randomUUID()
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      journal.run(() =>
        createShotOperation(
          shotInput(journal, { clientOperationId: operationId }),
        ),
      ),
    ),
  )
  assert.equal(new Set(results.map((row) => row.id)).size, 1)
  await journal.run(async () => {
    assert.equal(
      (await db.select({ value: count() }).from(shots).where(owned(shots)))[0]
        ?.value,
      1,
    )
    assert.equal(
      (
        await db
          .select({ value: count() })
          .from(clientOperations)
          .where(owned(clientOperations))
      )[0]?.value,
      1,
    )
  })
  const original = results[0]
  if (!original) throw new Error('Missing concurrent brew result')
  const updates = await Promise.allSettled(
    ['19', '20'].map((doseGrams) =>
      journal.run(() =>
        updateShotOperation(
          shotUpdateSchema.parse({
            ...shotInput(journal),
            id: original.id,
            baseRevision: original.revision,
            doseGrams,
          }),
        ),
      ),
    ),
  )
  assert.equal(
    updates.filter((result) => result.status === 'fulfilled').length,
    1,
  )
  assert.equal(
    updates.filter((result) => result.status === 'rejected').length,
    1,
  )
  await journal.run(async () => {
    const updated = await getShotOperation(original.id)
    assert.equal(updated?.revision, original.revision + 1)
  })
}

async function replicationCheckpoints(bindings: CloudflareRuntimeBindings) {
  const journal = await fixture(bindings)
  await journal.run(async () => {
    const initial = await createShotAndSaveRecipeOperation(
      createShotAndSaveRecipeSchema.parse({
        shot: shotInput(journal),
        target: { name: 'First' },
      }),
    )
    await createShotAndSaveRecipeOperation(
      createShotAndSaveRecipeSchema.parse({
        shot: shotInput(journal),
        target: { name: 'Second' },
      }),
    )
    if (!initial.recipe) throw new Error('Initial recipe missing')
    const firstPage = await pullRecipes({ batchSize: 1 })
    assert(firstPage.checkpoint.recipeId)
    const original = toDocument(initial.recipe)
    assert.deepEqual(
      await pushRecipes({
        rows: [
          {
            assumedMasterState: original,
            newDocumentState: { ...original, name: 'First updated' },
          },
        ],
      }),
      [],
    )
    await createShotAndSaveRecipeOperation(
      createShotAndSaveRecipeSchema.parse({
        shot: shotInput(journal),
        target: { name: 'Third' },
      }),
    )
    const seen = [...firstPage.documents]
    let checkpoint = firstPage.checkpoint
    while (checkpoint.recipeId) {
      const page = await pullRecipes({ checkpoint, batchSize: 1 })
      seen.push(...page.documents)
      checkpoint = page.checkpoint
    }
    for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
      const page = await pullRecipes({ checkpoint, batchSize: 1 })
      seen.push(...page.documents)
      assert(page.checkpoint.sequence >= checkpoint.sequence)
      checkpoint = page.checkpoint
      if (!page.documents.length) break
    }
    const latest = new Map(seen.map((document) => [document.syncId, document]))
    assert.equal(latest.size, 3)
    assert.equal(latest.get(original.syncId)?.name, 'First updated')
    const master = latest.get(original.syncId)
    if (!master) throw new Error('Updated recipe was lost')
    const concurrent = await Promise.all(
      ['Version A', 'Version B'].map((name) =>
        pushRecipes({
          rows: [
            {
              assumedMasterState: master,
              newDocumentState: { ...master, name },
            },
          ],
        }),
      ),
    )
    assert.equal(
      concurrent.filter((conflicts) => conflicts.length === 0).length,
      1,
    )
    assert.equal(
      concurrent.filter((conflicts) => conflicts.length === 1).length,
      1,
    )
    const stored = await db.query.recipes.findFirst({
      where: owned(recipes, eq(recipes.syncId, original.syncId)),
    })
    assert.equal(stored?.revision, master.serverRevision + 1)
    const changes = await db
      .select()
      .from(replicationChanges)
      .where(owned(replicationChanges))
    assert(changes.length >= 5)
  })
}

async function mediaAtomicity(bindings: CloudflareRuntimeBindings) {
  const alice = await fixture(bindings)
  const bob = await fixture(bindings)
  const brew = await alice.run(() => createShotOperation(shotInput(alice)))
  const base = `users/${alice.ownerId}/shots/${brew.id}/photo`
  const paths = [`${base}.jpg`, `${base}.thumb.webp`, `${base}.small.webp`]
  for (const path of paths)
    await bindings.MEDIA.put(path, new Uint8Array([1, 2, 3]))
  await alice.run(async () => {
    await db.insert(shotImages).values(
      journalInsertValues({
        shotId: brew.id,
        storagePath: paths[0] ?? '',
        mimeType: 'image/jpeg',
      }),
    )
  })
  await bob.run(() =>
    assert.rejects(deleteShotOperation({ id: brew.id }), /not found/i),
  )
  assert(await bindings.MEDIA.head(paths[0] ?? ''))
  await bindings.DB.exec(
    `create trigger reject_test_cleanup before insert on media_cleanup_jobs when NEW.owner_id='${alice.ownerId}' begin select raise(abort, 'verification cleanup failure'); end`,
  )
  try {
    await alice.run(() =>
      assert.rejects(
        deleteShotOperation({ id: brew.id }),
        /verification cleanup failure/,
      ),
    )
    await alice.run(async () => {
      assert(await getShotOperation(brew.id))
      assert.equal(
        (
          await db
            .select({ value: count() })
            .from(shotImages)
            .where(owned(shotImages))
        )[0]?.value,
        1,
      )
      assert.equal(
        (
          await db
            .select({ value: count() })
            .from(mediaCleanupJobs)
            .where(owned(mediaCleanupJobs))
        )[0]?.value,
        0,
      )
    })
  } finally {
    await bindings.DB.exec('drop trigger reject_test_cleanup')
  }
  await alice.run(() =>
    deleteShotOperation({ id: brew.id, baseRevision: brew.revision }),
  )
  for (const path of paths) assert.equal(await bindings.MEDIA.head(path), null)
  await alice.run(async () => {
    assert.equal(await getShotOperation(brew.id), undefined)
    assert.equal(
      (
        await db
          .select({ value: count() })
          .from(mediaCleanupJobs)
          .where(owned(mediaCleanupJobs))
      )[0]?.value,
      0,
    )
  })
}

export const verifyJournalCases = [
  { name: 'brew and recipe production operations', run: brewAndRecipe },
  {
    name: '100 tags and accessories across D1 parameter limits',
    run: largeRelations,
  },
  {
    name: 'cross-owner references roll back entire writes',
    run: ownershipRollback,
  },
  {
    name: 'simultaneous idempotency and stale integer revisions',
    run: concurrentIdempotency,
  },
  {
    name: 'recipe replication checkpoints and concurrent conflicts',
    run: replicationCheckpoints,
  },
  {
    name: 'R2 media cleanup, deletion rollback, and owner isolation',
    run: mediaAtomicity,
  },
]
