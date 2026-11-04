import { createIsomorphicFn } from '@tanstack/react-start'
import { getInternalStats as remote } from '@/lib/server/internal-stats'
import { imageTargets } from '@/modules/journal/images'
import { getClientJournal } from '../local-journal'
export const getInternalStats = createIsomorphicFn()
  .server(remote)
  .client(async () => {
    const state = await (await getClientJournal()).read()
    const images = Object.values(imageTargets).flatMap((target) =>
      state.tables[target.table].map((image) => ({
        storageBytes: image.storageBytes,
        sizeBytes: image.sizeBytes,
      })),
    )
    return {
      storage: {
        available: true,
        provider: 'local' as const,
        imageCount: images.length,
        totalBytes: images.reduce(
          (sum, image) => sum + (image.storageBytes ?? image.sizeBytes ?? 0),
          0,
        ),
        unmeasuredImages: images.filter((image) => image.storageBytes === null)
          .length,
        ...state.policy,
      },
    }
  })
