import sharp from "sharp"
export { getThumbnailPath } from "@/lib/image-path"

const THUMB_WIDTH = 640
const THUMB_QUALITY = 78

export function createThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()
}
