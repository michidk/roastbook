/**
 * Every stored picture comes in these WebP sizes, fitted inside a square of
 * `maxDimension`. The browser encodes them once; servers only encode pictures
 * the browser could not read. Quality is 0–100.
 */
export const pictureSizes = {
  stored: { maxDimension: 2048, quality: 82 },
  thumbnail: { maxDimension: 800, quality: 78 },
  small: { maxDimension: 256, quality: 72 },
} as const

export type PictureSize = keyof typeof pictureSizes
