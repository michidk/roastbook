import { demoCapabilityDisabled } from './disabled'

export type ModelMessage = unknown

export const chat = () => demoCapabilityDisabled('AI')

export const maxIterations = () => demoCapabilityDisabled('AI')
