import { demoCapabilityDisabled } from './disabled'

export type OpenAIChatModel = string

export const OPENAI_CHAT_MODELS: readonly string[] = []
export const createOpenaiChat = () => demoCapabilityDisabled('AI')
