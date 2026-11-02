import '@tanstack/react-start/server-only'

export interface ArchiveEntry {
  name: string
  body: ReadableStream<Uint8Array> | Uint8Array | string
}

const encoder = new TextEncoder()
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})
function record(size: number) {
  const bytes = new Uint8Array(size)
  return { bytes, view: new DataView(bytes.buffer) }
}

async function* archive(
  entries: AsyncIterable<ArchiveEntry>,
): AsyncGenerator<Uint8Array> {
  const directory: Uint8Array[] = []
  const names = new Set<string>()
  let directoryBytes = 0
  let offset = 0n
  for await (const entry of entries) {
    const name = encoder.encode(entry.name)
    if (
      !entry.name ||
      entry.name.startsWith('/') ||
      entry.name.includes('\\') ||
      Array.from(entry.name).some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      entry.name
        .split('/')
        .some((part) => !part || part === '.' || part === '..') ||
      /^[a-z]:/i.test(entry.name) ||
      name.length > 65535 ||
      names.has(entry.name) ||
      names.size >= 100000
    )
      throw new Error('Invalid archive entry')
    names.add(entry.name)
    const start = offset
    const local = record(30 + name.length + 20)
    local.view.setUint32(0, 0x04034b50, true)
    local.view.setUint16(4, 45, true)
    local.view.setUint16(6, 0x808, true)
    local.view.setUint16(12, 0x21, true)
    local.view.setUint32(18, 0xffffffff, true)
    local.view.setUint32(22, 0xffffffff, true)
    local.view.setUint16(26, name.length, true)
    local.view.setUint16(28, 20, true)
    local.bytes.set(name, 30)
    local.view.setUint16(30 + name.length, 1, true)
    local.view.setUint16(32 + name.length, 16, true)
    yield local.bytes
    offset += BigInt(local.bytes.length)
    let size = 0n
    let crc = 0xffffffff
    async function* chunks() {
      if (typeof entry.body === 'string') {
        yield encoder.encode(entry.body)
        return
      }
      if (entry.body instanceof Uint8Array) {
        yield entry.body
        return
      }
      const reader = entry.body.getReader()
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) return
          yield chunk.value
        }
      } finally {
        await reader.cancel()
        reader.releaseLock()
      }
    }
    for await (const chunk of chunks()) {
      for (const byte of chunk)
        crc = (crcTable[(crc ^ byte) & 255] ?? 0) ^ (crc >>> 8)
      size += BigInt(chunk.length)
      offset += BigInt(chunk.length)
      yield chunk
    }
    crc = (crc ^ 0xffffffff) >>> 0
    const descriptor = record(24)
    descriptor.view.setUint32(0, 0x08074b50, true)
    descriptor.view.setUint32(4, crc, true)
    descriptor.view.setBigUint64(8, size, true)
    descriptor.view.setBigUint64(16, size, true)
    yield descriptor.bytes
    offset += 24n
    const central = record(46 + name.length + 28)
    central.view.setUint32(0, 0x02014b50, true)
    central.view.setUint16(4, 45, true)
    central.view.setUint16(6, 45, true)
    central.view.setUint16(8, 0x808, true)
    central.view.setUint16(14, 0x21, true)
    central.view.setUint32(16, crc, true)
    central.view.setUint32(20, 0xffffffff, true)
    central.view.setUint32(24, 0xffffffff, true)
    central.view.setUint16(28, name.length, true)
    central.view.setUint16(30, 28, true)
    central.view.setUint32(42, 0xffffffff, true)
    central.bytes.set(name, 46)
    central.view.setUint16(46 + name.length, 1, true)
    central.view.setUint16(48 + name.length, 24, true)
    central.view.setBigUint64(50 + name.length, size, true)
    central.view.setBigUint64(58 + name.length, size, true)
    central.view.setBigUint64(66 + name.length, start, true)
    directoryBytes += central.bytes.length
    if (directoryBytes > 16 * 1024 * 1024)
      throw new Error('Archive directory exceeds size limit')
    directory.push(central.bytes)
  }
  const centralOffset = offset
  for (const bytes of directory) {
    yield bytes
    offset += BigInt(bytes.length)
  }
  const end = record(98)
  end.view.setUint32(0, 0x06064b50, true)
  end.view.setBigUint64(4, 44n, true)
  end.view.setUint16(12, 45, true)
  end.view.setUint16(14, 45, true)
  end.view.setBigUint64(24, BigInt(directory.length), true)
  end.view.setBigUint64(32, BigInt(directory.length), true)
  end.view.setBigUint64(40, offset - centralOffset, true)
  end.view.setBigUint64(48, centralOffset, true)
  end.view.setUint32(56, 0x07064b50, true)
  end.view.setBigUint64(64, offset, true)
  end.view.setUint32(72, 1, true)
  end.view.setUint32(76, 0x06054b50, true)
  end.view.setUint16(84, 0xffff, true)
  end.view.setUint16(86, 0xffff, true)
  end.view.setUint32(88, 0xffffffff, true)
  end.view.setUint32(92, 0xffffffff, true)
  yield end.bytes
}

/** Streams ZIP64 without buffering image contents or using a filesystem. */
export function createExportArchive({
  entries,
}: {
  entries: AsyncIterable<ArchiveEntry>
}): ReadableStream<Uint8Array> {
  const iterator = archive(entries)
  return new ReadableStream(
    {
      async pull(controller) {
        try {
          const next = await iterator.next()
          if (next.done) controller.close()
          else controller.enqueue(next.value)
        } catch (error) {
          controller.error(error)
        }
      },
      async cancel() {
        await iterator.return(undefined)
      },
    },
    { highWaterMark: 0 },
  )
}
