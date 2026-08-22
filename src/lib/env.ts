const configuredStorageUrl = import.meta.env.VITE_STORAGE_URL?.trim()

export const publicEnv = {
  VITE_STORAGE_URL: configuredStorageUrl || '/media',
} as const
