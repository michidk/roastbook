import { createServerOnlyFn } from '@tanstack/react-start'
import { demoCapabilityDisabled } from './disabled'

const imageProcessingDisabled = () => demoCapabilityDisabled('Image processing')

export const validateImageBuffer = createServerOnlyFn(imageProcessingDisabled)
export const createThumbnail = createServerOnlyFn(imageProcessingDisabled)
export const createSmallThumbnail = createServerOnlyFn(imageProcessingDisabled)
export const createStoredImage = createServerOnlyFn(imageProcessingDisabled)
export const createAiImage = createServerOnlyFn(imageProcessingDisabled)
