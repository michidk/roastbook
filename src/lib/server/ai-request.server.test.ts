import { describe, expect, test } from 'bun:test'
import { webSearchTool } from '@tanstack/ai-openai/tools'
import { z } from 'zod'
import { createAiProviderFetch } from './ai-provider-fetch.server'
import { type AiRequestRecorder, runAiRequest } from './ai-request.server'
import type { AiProviderConfig } from './ai-runtime.server'

const image =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZxkAAAAASUVORK5CYII='

async function fixture<T>(
  api: 'responses' | 'chat-completions',
  work: (context: {
    config: AiProviderConfig
    recorder: AiRequestRecorder
    requests: Array<{ path: string; body: Record<string, unknown> }>
    events: Array<{ status: string; data: unknown }>
  }) => Promise<T>,
  {
    content = '{"name":"Coffee"}',
    finish = 'stop',
    status = 200,
    delay = 0,
  } = {},
) {
  const requests: Array<{ path: string; body: Record<string, unknown> }> = []
  const events: Array<{ status: string; data: unknown }> = []
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      requests.push({
        path: new URL(request.url).pathname,
        body: await request.json(),
      })
      if (delay) await Bun.sleep(delay)
      if (status !== 200)
        return Response.json({ error: 'PRIVATE_PROVIDER_ERROR' }, { status })
      const response =
        api === 'responses'
          ? [
              {
                type:
                  finish === 'length'
                    ? 'response.incomplete'
                    : finish === 'error'
                      ? 'response.failed'
                      : 'response.completed',
                sequence_number: 0,
                response: {
                  id: 'resp_fixture',
                  object: 'response',
                  created_at: 0,
                  status:
                    finish === 'length'
                      ? 'incomplete'
                      : finish === 'error'
                        ? 'failed'
                        : 'completed',
                  ...(finish === 'error'
                    ? {
                        error: {
                          code: 'server_error',
                          message: 'PRIVATE_PROVIDER_ERROR',
                        },
                      }
                    : {}),
                  ...(finish === 'length'
                    ? { incomplete_details: { reason: 'max_output_tokens' } }
                    : {}),
                  model: 'fixture-model',
                  output: [
                    {
                      id: 'msg_fixture',
                      type: 'message',
                      role: 'assistant',
                      status: 'completed',
                      content: [
                        { type: 'output_text', text: content, annotations: [] },
                      ],
                    },
                  ],
                  usage: {
                    input_tokens: 20,
                    output_tokens: 10,
                    total_tokens: 30,
                  },
                },
              },
            ]
          : [
              {
                id: 'chat_fixture',
                object: 'chat.completion.chunk',
                created: 0,
                model: 'fixture-model',
                choices: [
                  {
                    index: 0,
                    delta: { role: 'assistant', content },
                    finish_reason: finish,
                  },
                ],
                usage: {
                  prompt_tokens: 20,
                  completion_tokens: 10,
                  total_tokens: 30,
                },
              },
            ]
      return new Response(
        `${response.map((part) => `data: ${JSON.stringify(part)}\n\n`).join('')}data: [DONE]\n\n`,
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    },
  })
  const baseURL = `http://127.0.0.1:${server.port}/v1`
  const recorder: AiRequestRecorder = {
    async startAiRequestLog(data) {
      events.push({ status: 'started', data })
      return 1
    },
    async completeAiRequestLog(data) {
      events.push({ status: 'succeeded', data })
    },
    async failAiRequestLog(data) {
      events.push({ status: data.aborted ? 'aborted' : 'failed', data })
    },
  }
  const config: AiProviderConfig = {
    baseURL,
    api,
    apiKey: 'fixture-key',
    visionModel: 'fixture-model',
    researchModel: 'fixture-model',
    providerMode: 'byo',
    fetch: createAiProviderFetch(baseURL, {
      policy: {
        deploymentMode: 'self-hosted',
        privateOrigins: [new URL(baseURL).origin],
      },
    }),
  }
  try {
    return await work({ config, recorder, requests, events })
  } finally {
    server.stop(true)
  }
}

describe.each(['responses', 'chat-completions'] as const)(
  '%s AI execution',
  (api) => {
    test('sends multimodal JSON requests through the selected protocol and records one result', async () => {
      await fixture(api, async ({ config, recorder, requests, events }) => {
        const result = await runAiRequest(
          {
            config,
            model: config.visionModel,
            requestType: 'bean-image-extraction',
            timeoutMs: 1000,
            requestPayload: { imageCount: 2 },
            execute: async ({ generateText }) =>
              JSON.parse(
                await generateText({
                  systemPrompts: ['Read visible text and return JSON.'],
                  format: 'json-object',
                  messages: [
                    {
                      role: 'user',
                      content: [
                        {
                          type: 'image',
                          source: {
                            type: 'data',
                            value: image,
                            mimeType: 'image/png',
                          },
                          metadata: { detail: 'high' },
                        },
                        {
                          type: 'image',
                          source: {
                            type: 'data',
                            value: image,
                            mimeType: 'image/png',
                          },
                          metadata: { detail: 'high' },
                        },
                        { type: 'text', content: 'Read the bag.' },
                      ],
                    },
                  ],
                }),
              ),
          },
          recorder,
        )
        expect(result).toEqual({ name: 'Coffee' })
        expect(requests).toHaveLength(1)
        const request = requests[0]
        expect(request?.path).toBe(
          api === 'responses' ? '/v1/responses' : '/v1/chat/completions',
        )
        expect(request?.body.store).toBe(false)
        expect(request?.body.temperature).toBeUndefined()
        const serialized = JSON.stringify(request?.body)
        expect(serialized.match(/data:image\/png;base64/g)).toHaveLength(2)
        expect(serialized.match(/"detail":"high"/g)).toHaveLength(2)
        expect(serialized).toContain(
          api === 'responses' ? 'input_image' : 'image_url',
        )
        expect(
          api === 'responses'
            ? request?.body.text
            : request?.body.response_format,
        ).toEqual(
          api === 'responses'
            ? { format: { type: 'json_object' } }
            : { type: 'json_object' },
        )
        expect(events.map((event) => event.status)).toEqual([
          'started',
          'succeeded',
        ])
        expect(events[1]?.data).toMatchObject({
          usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        })
        expect(JSON.stringify(events)).not.toContain(image)
        expect(JSON.stringify(events)).not.toContain('fixture-key')
      })
    })

    test('retains billed usage when feature parsing fails', async () => {
      await fixture(api, async ({ config, recorder, events }) => {
        await expect(
          runAiRequest(
            {
              config,
              model: config.visionModel,
              requestType: 'fixture',
              timeoutMs: 1000,
              requestPayload: {},
              execute: async ({ generateText }) => {
                await generateText({
                  messages: [{ role: 'user', content: 'Return JSON' }],
                  format: 'json-object',
                })
                throw new Error('Invalid structured output')
              },
            },
            recorder,
          ),
        ).rejects.toThrow('invalid output')
        expect(events.map((event) => event.status)).toEqual([
          'started',
          'failed',
        ])
        expect(events[1]?.data).toMatchObject({ usage: { totalTokens: 30 } })
      })
    })

    for (const finish of api === 'responses' ? ['length', 'error'] : ['length'])
      test(`rejects terminal ${finish} and retains usage`, async () => {
        await fixture(
          api,
          async ({ config, recorder, events }) => {
            await expect(
              runAiRequest(
                {
                  config,
                  model: config.visionModel,
                  requestType: 'fixture',
                  timeoutMs: 1000,
                  requestPayload: {},
                  execute: ({ generateText }) =>
                    generateText({
                      messages: [{ role: 'user', content: 'Return JSON' }],
                      format: 'json-object',
                    }),
                },
                recorder,
              ),
            ).rejects.toThrow()
            expect(events.map((event) => event.status)).toEqual([
              'started',
              'failed',
            ])
            expect(events[1]?.data).toMatchObject({
              usage: { totalTokens: 30 },
            })
          },
          { finish },
        )
      })

    for (const [status, message] of [
      [400, 'request failed (400)'],
      [401, 'API key'],
      [403, 'API key'],
      [429, 'rate limit'],
      [503, 'temporarily unavailable'],
    ] as const)
      test(`preserves safe guidance for ${status} without retrying`, async () => {
        await fixture(
          api,
          async ({ config, recorder, requests, events }) => {
            await expect(
              runAiRequest(
                {
                  config,
                  model: config.visionModel,
                  requestType: 'fixture',
                  timeoutMs: 1000,
                  requestPayload: {},
                  execute: ({ generateText }) =>
                    generateText({
                      messages: [{ role: 'user', content: 'Read' }],
                      format: 'text',
                    }),
                },
                recorder,
              ),
            ).rejects.toThrow(message)
            expect(requests).toHaveLength(1)
            expect(events.map((event) => event.status)).toEqual([
              'started',
              'failed',
            ])
            expect(JSON.stringify(events)).not.toContain(
              'PRIVATE_PROVIDER_ERROR',
            )
          },
          { status },
        )
      })

    test('records deadline expiration as aborted', async () => {
      await fixture(
        api,
        async ({ config, recorder, events }) => {
          await expect(
            runAiRequest(
              {
                config,
                model: config.visionModel,
                requestType: 'fixture',
                timeoutMs: 10,
                requestPayload: {},
                execute: ({ generateText }) =>
                  generateText({
                    messages: [{ role: 'user', content: 'Read' }],
                    format: 'text',
                  }),
              },
              recorder,
            ),
          ).rejects.toThrow('timed out')
          expect(events.map((event) => event.status)).toEqual([
            'started',
            'aborted',
          ])
        },
        { delay: 100 },
      )
    })

    test('uses structured output without exposing SDK lifecycle options', async () => {
      await fixture(api, async ({ config, recorder, requests }) => {
        const result = await runAiRequest(
          {
            config,
            model: config.researchModel,
            requestType: 'recommendation',
            timeoutMs: 1000,
            requestPayload: {},
            execute: ({ generateObject }) =>
              generateObject({
                messages: [{ role: 'user', content: 'Return the name' }],
                outputSchema: z.object({ name: z.string() }),
              }),
          },
          recorder,
        )
        expect(result).toEqual({ name: 'Coffee' })
        expect(requests.every(({ body }) => body.store === false)).toBe(true)
      })
    })
  },
)

test('preserves Responses hosted web search', async () => {
  await fixture('responses', async ({ config, recorder, requests }) => {
    await runAiRequest(
      {
        config,
        model: config.researchModel,
        requestType: 'research',
        timeoutMs: 1000,
        requestPayload: {},
        execute: ({ generateText }) =>
          generateText({
            messages: [{ role: 'user', content: 'Research coffee' }],
            format: 'text',
            tools: [webSearchTool({ type: 'web_search' })],
          }),
      },
      recorder,
    )
    expect(requests[0]?.body.tools).toEqual([{ type: 'web_search' }])
  })
})
