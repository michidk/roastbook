import { expect, spyOn, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getTableName } from 'drizzle-orm'
import { journalTables } from '@/journal/tables'
import { demoAiFunction } from '../packages/journal-demo/src/ai'
import { demoAiResponsesSchema } from '../packages/journal-demo/src/ai-responses'
import { demoFunction } from '../packages/journal-demo/src/functions'

function presetResponse(operation: string) {
  return (options?: unknown) => demoAiFunction(operation, options)
}

test('generated fictional fixtures cover every journal table', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roastbook-fixtures-'))
  try {
    const process = Bun.spawn(
      ['bun', 'scripts/generate-demo-snapshot.ts', directory],
      { stdout: 'pipe', stderr: 'pipe' },
    )
    const [code, stderr] = await Promise.all([
      process.exited,
      new Response(process.stderr).text(),
    ])
    if (code !== 0) throw new Error(stderr)
    const { tables } = (await Bun.file(
      join(directory, 'journal.json'),
    ).json()) as {
      tables: Record<string, Array<Record<string, unknown>>>
    }
    expect(Object.keys(tables).sort()).toEqual(
      journalTables.map((table) => getTableName(table)).sort(),
    )
    expect(tables.beans?.length).toBeGreaterThan(2)
    expect(tables.settings).toHaveLength(1)
    // Sample pictures are site assets, not the visitor's browser storage.
    expect(tables.bean_images?.every((image) => image.storageBytes === 0)).toBe(
      true,
    )
    expect(
      Object.values(tables)
        .flat()
        .some((row) => 'ownerId' in row),
    ).toBe(false)
    const payload = await Bun.file(join(directory, 'ai.json')).text()
    const presets = demoAiResponsesSchema.parse(JSON.parse(payload))
    expect(presets.beans).toHaveLength(tables.beans?.length ?? 0)
    expect(presets.brews).toHaveLength(tables.brews?.length ?? 0)
    const fetch = spyOn(globalThis, 'fetch').mockImplementation(
      Object.assign(
        async (input: RequestInfo | URL) => {
          expect(input).toBe('/demo-local/ai.json')
          return new Response(payload)
        },
        { preconnect: globalThis.fetch.preconnect },
      ),
    )
    try {
      expect(
        await demoFunction(
          'shot-recommendations/checkShotRecommendationEnabled',
        )(),
      ).toEqual({ enabled: true })
      expect(await demoFunction('research/checkVisionEnabled')()).toEqual({
        enabled: false,
      })
      for (const bean of presets.beans) {
        expect(
          await presetResponse('research/researchBeanInfo')({
            data: { beanName: bean.name },
          }),
        ).toEqual(bean.research)
        const latest = presets.brews.find((brew) => brew.beanId === bean.id)
        expect(
          await presetResponse('shot-recommendations/getShotRecommendation')({
            data: { beanId: bean.id },
          }),
        ).toMatchObject({
          recommendation:
            latest?.result.recommendation ?? bean.fallback.recommendation,
          basis: { beanName: bean.name, focusedShotAt: null },
        })
      }
      for (const brew of presets.brews) {
        const request = { shotId: brew.id }
        expect(
          await presetResponse('shot-recommendations/getShotRecommendation')({
            data: request,
          }),
        ).toEqual(brew.result)
        for (const [
          index,
          question,
        ] of brew.result.recommendation.followUpQuestions.entries()) {
          expect(
            await presetResponse(
              'shot-recommendations/chatAboutShotRecommendation',
            )({
              data: {
                request,
                recommendation: brew.result.recommendation,
                messages: [{ role: 'user', content: question }],
              },
            }),
          ).toEqual({ answer: brew.answers[index] })
        }
      }
      const brew = presets.brews[0]
      if (!brew) throw new Error('Expected sample brews')
      expect(
        await presetResponse(
          'shot-recommendations/chatAboutShotRecommendation',
        )({
          data: {
            request: { shotId: brew.id },
            recommendation: brew.result.recommendation,
            messages: [
              { role: 'user', content: 'An arbitrary custom question?' },
            ],
          },
        }),
      ).toMatchObject({
        answer: {
          blocks: [
            { type: 'note', text: expect.stringContaining('preset answers') },
          ],
        },
      })
      await expect(
        presetResponse('shot-recommendations/getShotRecommendation')({
          data: { shotId: 999999 },
        }),
      ).rejects.toThrow('No preset recommendation')
      await expect(
        presetResponse('research/researchBeanInfo')({
          data: { beanName: 'A new coffee' },
        }),
      ).rejects.toThrow('original demo beans')
      await expect(
        demoFunction('research/extractBeanInfo')({ data: {} }),
      ).rejects.toThrow('unavailable')
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
      fetch.mockRestore()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 90000)
