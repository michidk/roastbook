import { describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createExportArchive } from './export-archive.server'

describe('Cloudflare account export archive', () => {
  test('standard ZIP readers verify streamed Unicode files and empty files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'roastbook-zip-'))
    try {
      async function* entries() {
        yield { name: 'journal.json', body: '{"brews":[]}' }
        yield {
          name: 'images/café.webp',
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array([1, 2, 3]))
              controller.enqueue(new Uint8Array([4, 5]))
              controller.close()
            },
          }),
        }
        yield { name: 'empty.txt', body: new Uint8Array() }
      }
      await writeFile(
        join(directory, 'export.zip'),
        new Uint8Array(
          await new Response(
            createExportArchive({ entries: entries() }),
          ).arrayBuffer(),
        ),
      )
      const verifier = Bun.spawn(
        [
          'python3',
          '-c',
          'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read("images/café.webp") == bytes([1,2,3,4,5]); assert z.read("empty.txt") == b""; assert z.read("journal.json") == b\'{"brews":[]}\'; print(len(z.infolist()))',
          join(directory, 'export.zip'),
        ],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      expect(await new Response(verifier.stdout).text()).toBe('3\n')
      expect(await verifier.exited).toBe(0)
      expect(
        (await readFile(join(directory, 'export.zip'))).length,
      ).toBeGreaterThan(300)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  test.each([
    '../secret',
    '/absolute',
    'a/../b',
    'C:/secret',
    'a\\b',
    'a\x00b',
  ])('rejects unsafe archive name %j', async (name) => {
    async function* entries() {
      yield { name, body: '' }
    }
    await expect(
      new Response(createExportArchive({ entries: entries() })).arrayBuffer(),
    ).rejects.toThrow('Invalid archive entry')
  })
  test('cancellation closes source and does not read ahead', async () => {
    let cancelled = false
    let reads = 0
    async function* entries() {
      yield {
        name: 'image.webp',
        body: new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              reads++
              controller.enqueue(new Uint8Array(10))
            },
            cancel() {
              cancelled = true
            },
          },
          { highWaterMark: 0 },
        ),
      }
    }
    const reader = createExportArchive({ entries: entries() }).getReader()
    await reader.read()
    expect(reads).toBe(0)
    await reader.read()
    expect(reads).toBe(1)
    await reader.cancel()
    expect(cancelled).toBe(true)
  })
})
