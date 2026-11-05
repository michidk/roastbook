import { describe, expect, test } from 'bun:test'
import { chat } from '@tanstack/ai'
import { webSearchTool } from '@tanstack/ai-openai/tools'
import { createAiAdapter, type getOpenAIConfig } from './ai-runtime.server'

type Config = Awaited<ReturnType<typeof getOpenAIConfig>>

async function captureRequest(api: Config['api'], research = false) {
  let request: Request | undefined
  const config: Config = {
    baseURL: 'https://provider.example/v1',
    api,
    apiKey: 'fixture-key',
    visionModel: 'gpt-4.1-mini',
    researchModel: 'gpt-5-mini',
    providerMode: 'byo',
    visionRequestLimits: {},
    authFailureMessage: 'Fixture authentication error',
    fetch: Object.assign(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        request = new Request(input, init)
        return new Response('data: [DONE]\n\n', {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      },
      { preconnect: () => {} },
    ),
  }
  const adapter = createAiAdapter('gpt-5-mini', config)
  await chat({
    adapter,
    threadId: 'fixture-research',
    messages: [{ role: 'user', content: 'Research a coffee roaster' }],
    ...(research ? { tools: [webSearchTool({ type: 'web_search' })] } : {}),
    stream: false,
  })
  if (!request) throw new Error('Adapter did not issue a request')
  return { url: request.url, body: await request.json() }
}

describe('AI provider request serialization', () => {
  test('sends hosted web search rather than a client function over Responses', async () => {
    const { url, body } = await captureRequest('responses', true)
    expect(url).toBe('https://provider.example/v1/responses')
    expect(body.tools).toEqual([{ type: 'web_search' }])
    expect(body.model).toBe('gpt-5-mini')
  })

  test('keeps plain Responses requests free of research tools', async () => {
    const { body } = await captureRequest('responses')
    expect(body.tools ?? []).toEqual([])
  })

  test('preserves the configured Chat Completions endpoint', async () => {
    const { url, body } = await captureRequest('chat-completions')
    expect(url).toBe('https://provider.example/v1/chat/completions')
    expect(body.messages).toEqual([
      { role: 'user', content: 'Research a coffee roaster' },
    ])
  })
})
