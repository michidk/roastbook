import { describe, expect, test } from 'bun:test'
import { EventType, type StreamChunk } from '@tanstack/ai'
import { retainTerminalAiEvent } from '@/lib/server/ai-request-logs.server'

describe('AI request log events', () => {
  test('retains only the terminal event', () => {
    const contentEvent: StreamChunk = {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: 'message-1',
      delta: 'partial output',
    }
    const finishedEvent: StreamChunk = {
      type: EventType.RUN_FINISHED,
      runId: 'run-1',
      threadId: 'thread-1',
      finishReason: 'stop',
    }

    let events: ReadonlyArray<StreamChunk> = []
    events = retainTerminalAiEvent(events, contentEvent)
    events = retainTerminalAiEvent(events, finishedEvent)
    events = retainTerminalAiEvent(events, contentEvent)

    expect(events).toEqual([finishedEvent])
  })
})
