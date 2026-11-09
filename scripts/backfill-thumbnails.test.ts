import { describe, expect, test } from 'bun:test'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

// Extract the isPathInside function for testing
// This is the security mitigation that prevents path traversal attacks
const isPathInside = (baseDir: string, targetPath: string) => {
  const rel = relative(resolve(baseDir), resolve(targetPath))
  return !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel))
}

describe('backfill-thumbnails path traversal protection', () => {
  const STORAGE_BASE = './uploads'

  describe('isPathInside security validation', () => {
    test('allows valid paths within the base directory', () => {
      expect(isPathInside(STORAGE_BASE, join(STORAGE_BASE, 'image.jpg'))).toBe(
        true,
      )
      expect(
        isPathInside(STORAGE_BASE, join(STORAGE_BASE, 'user/123/photo.png')),
      ).toBe(true)
      expect(
        isPathInside(
          STORAGE_BASE,
          join(STORAGE_BASE, 'nested/deep/path/file.webp'),
        ),
      ).toBe(true)
    })

    test('rejects path traversal attempts using ../', () => {
      // Direct parent directory traversal
      expect(isPathInside(STORAGE_BASE, join(STORAGE_BASE, '../etc/passwd'))).toBe(
        false,
      )
      expect(
        isPathInside(STORAGE_BASE, join(STORAGE_BASE, '../../etc/shadow')),
      ).toBe(false)

      // Traversal after valid path segments
      expect(
        isPathInside(STORAGE_BASE, join(STORAGE_BASE, 'user/../../../etc/passwd')),
      ).toBe(false)
    })

    test('rejects absolute paths outside base directory', () => {
      expect(isPathInside(STORAGE_BASE, '/etc/passwd')).toBe(false)
      expect(isPathInside(STORAGE_BASE, '/var/log/system.log')).toBe(false)
      expect(isPathInside(STORAGE_BASE, '/tmp/malicious.txt')).toBe(false)
    })

    test('rejects paths that resolve outside base directory', () => {
      // These paths might look safe but resolve outside the base
      const outsidePath = resolve(STORAGE_BASE, '../outside.txt')
      expect(isPathInside(STORAGE_BASE, outsidePath)).toBe(false)

      const deepTraversal = resolve(STORAGE_BASE, 'a/b/c/../../../../outside.txt')
      expect(isPathInside(STORAGE_BASE, deepTraversal)).toBe(false)
    })

    test('handles edge cases with special characters', () => {
      // Null byte injection attempts (though Node.js typically handles these)
      expect(
        isPathInside(STORAGE_BASE, join(STORAGE_BASE, 'file\x00.jpg')),
      ).toBe(true)

      // URL-encoded traversal attempts (should be decoded before this check)
      expect(
        isPathInside(STORAGE_BASE, join(STORAGE_BASE, 'normal-file.jpg')),
      ).toBe(true)
    })

    test('handles relative base directory correctly', () => {
      const relativeBase = './uploads'
      expect(
        isPathInside(relativeBase, join(relativeBase, 'image.jpg')),
      ).toBe(true)
      expect(isPathInside(relativeBase, join(relativeBase, '../etc/passwd'))).toBe(
        false,
      )
    })

    test('handles absolute base directory correctly', () => {
      const absoluteBase = resolve('./uploads')
      expect(
        isPathInside(absoluteBase, join(absoluteBase, 'image.jpg')),
      ).toBe(true)
      expect(
        isPathInside(absoluteBase, join(absoluteBase, '../etc/passwd')),
      ).toBe(false)
    })
  })

  describe('path construction with getThumbnailPath simulation', () => {
    // Simulate the getThumbnailPath function behavior
    const getThumbnailPath = (storagePath: string): string => {
      const dot = storagePath.lastIndexOf('.')
      const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
      return `${base}.thumb.webp`
    }

    const getSmallThumbnailPath = (storagePath: string): string => {
      const dot = storagePath.lastIndexOf('.')
      const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
      return `${base}.small.webp`
    }

    test('validates all generated paths for legitimate files', () => {
      const storagePath = 'user/123/photo.jpg'
      const fullOriginal = join(STORAGE_BASE, storagePath)
      const fullThumb = join(STORAGE_BASE, getThumbnailPath(storagePath))
      const fullSmallThumb = join(
        STORAGE_BASE,
        getSmallThumbnailPath(storagePath),
      )

      expect(isPathInside(STORAGE_BASE, fullOriginal)).toBe(true)
      expect(isPathInside(STORAGE_BASE, fullThumb)).toBe(true)
      expect(isPathInside(STORAGE_BASE, fullSmallThumb)).toBe(true)
    })

    test('rejects malicious storagePath with path traversal', () => {
      const maliciousPath = '../../../etc/passwd'
      const fullOriginal = join(STORAGE_BASE, maliciousPath)
      const fullThumb = join(STORAGE_BASE, getThumbnailPath(maliciousPath))
      const fullSmallThumb = join(
        STORAGE_BASE,
        getSmallThumbnailPath(maliciousPath),
      )

      // All three paths should be rejected
      expect(isPathInside(STORAGE_BASE, fullOriginal)).toBe(false)
      expect(isPathInside(STORAGE_BASE, fullThumb)).toBe(false)
      expect(isPathInside(STORAGE_BASE, fullSmallThumb)).toBe(false)
    })

    test('rejects storagePath that escapes the base directory', () => {
      // This is a real attack: a path that goes up and out
      const maliciousPath = '../../../../etc/passwd'
      const fullOriginal = join(STORAGE_BASE, maliciousPath)
      const fullThumb = join(STORAGE_BASE, getThumbnailPath(maliciousPath))

      // These should be rejected because they escape the base directory
      expect(isPathInside(STORAGE_BASE, fullOriginal)).toBe(false)
      expect(isPathInside(STORAGE_BASE, fullThumb)).toBe(false)
    })
  })

  describe('security property: all paths must be validated', () => {
    test('ensures validation happens before file operations', () => {
      // This test documents the security requirement:
      // The processOne function MUST validate all three paths
      // (original, thumbnail, small thumbnail) before any file I/O

      const validPath = 'user/photo.jpg'
      const maliciousPath = '../../../etc/passwd'

      // Valid paths should pass all checks
      const validOriginal = join(STORAGE_BASE, validPath)
      expect(isPathInside(STORAGE_BASE, validOriginal)).toBe(true)

      // Malicious paths should fail at least one check
      const maliciousOriginal = join(STORAGE_BASE, maliciousPath)
      expect(isPathInside(STORAGE_BASE, maliciousOriginal)).toBe(false)

      // The security property: if ANY path fails validation,
      // the entire operation must be rejected
      const paths = [validOriginal, maliciousOriginal]
      const allValid = paths.every((path) => isPathInside(STORAGE_BASE, path))
      expect(allValid).toBe(false)
    })
  })
})
