export interface ImageFile {
  /** The stored WebP picture, encoded once in its final size. */
  readonly file: File
  readonly thumbnail: File
  readonly small: File
  readonly preview: string
  readonly base64: string
}
