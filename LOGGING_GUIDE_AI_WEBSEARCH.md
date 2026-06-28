# TanStack AI + OpenAI Web Search Logging Guide

## Problem
`researchBeanFromWeb()` returns empty results. Need low-noise, actionable logging at critical points in the chat stream pipeline.

## Root Cause Analysis Points

The `chat()` stream with `webSearchTool` emits multiple chunk types. Your current code only checks for `TEXT_MESSAGE_CONTENT`, but the tool execution flow includes:

1. **TOOL_CALL** - Model decides to invoke web search
2. **TOOL_RESULT** - Search results returned from OpenAI
3. **TEXT_MESSAGE_CONTENT** - Final text response (what you're capturing)

If web search fails silently or returns no results, you'll see empty `TEXT_MESSAGE_CONTENT` with no visibility into why.

---

## Recommended Logging Points

### 1. **Request Query Logging** (Entry Point)
**Location:** Top of `researchBeanFromWeb()` before `chat()` call

```typescript
export async function researchBeanFromWeb(
  beanName: string,
  roasterName?: string
): Promise<ExtractedBeanInfo> {
  if (!apiKey) {
    return {}
  }

  const searchQuery = roasterName
    ? `${roasterName} ${beanName} coffee beans`
    : `${beanName} coffee beans`

  // ✅ LOG 1: Request entry
  console.log('[AI:research] Query:', { searchQuery, beanName, roasterName })

  const systemPrompt = `...`

  const stream = chat({
    adapter: openaiText(researchModel, apiKey, { baseURL }),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Search for information about this coffee: "${searchQuery}"` },
    ],
    tools: [webSearchTool({ type: "web_search" })],
  })

  // ... rest of function
}
```

**Why:** Confirms the query is well-formed and being sent to the model.

---

### 2. **Stream Chunk Type Logging** (Tool Execution Visibility)
**Location:** Inside the `for await` loop

```typescript
  let content = ""
  let toolCallCount = 0
  let toolResultCount = 0

  for await (const chunk of stream) {
    // ✅ LOG 2: All chunk types (not just TEXT_MESSAGE_CONTENT)
    console.log('[AI:research] Chunk type:', chunk.type, {
      hasContent: !!chunk.content,
      contentLength: chunk.content?.length || 0,
    })

    // Track tool execution
    if (chunk.type === 'TOOL_CALL') {
      toolCallCount++
      console.log('[AI:research] Tool call:', {
        toolName: chunk.toolName,
        toolId: chunk.toolId,
      })
    }

    if (chunk.type === 'TOOL_RESULT') {
      toolResultCount++
      console.log('[AI:research] Tool result:', {
        toolId: chunk.toolId,
        resultLength: chunk.result?.length || 0,
        hasError: !!chunk.error,
        error: chunk.error,
      })
    }

    if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
      content = chunk.content
      console.log('[AI:research] Text chunk:', {
        delta: chunk.delta?.substring(0, 100), // First 100 chars
        totalLength: content.length,
      })
    }
  }

  // ✅ LOG 3: Stream summary
  console.log('[AI:research] Stream complete:', {
    toolCalls: toolCallCount,
    toolResults: toolResultCount,
    finalContentLength: content.length,
    isEmpty: !content,
  })
```

**Why:** 
- Reveals if web search tool was even invoked
- Shows if tool results came back (but were empty)
- Distinguishes between "no tool call" vs "tool call with no results"

---

### 3. **Parse Failure Logging** (JSON Extraction)
**Location:** JSON parsing section

```typescript
  if (!content) {
    console.log('[AI:research] No content returned from stream')
    return {}
  }

  try {
    const parsed = JSON.parse(content) as ExtractedBeanInfo
    console.log('[AI:research] Parse success:', {
      fields: Object.keys(parsed),
      hasName: !!parsed.name,
      hasOrigin: !!parsed.origin,
    })
    return parsed
  } catch (error) {
    // ✅ LOG 4: Parse failure with context
    console.log('[AI:research] Parse failed:', {
      error: error instanceof Error ? error.message : String(error),
      contentPreview: content.substring(0, 200),
      contentLength: content.length,
    })
    return {}
  }
}
```

**Why:** Shows if the model returned valid JSON or malformed text.

---

## Complete Instrumented Function

```typescript
export async function researchBeanFromWeb(
  beanName: string,
  roasterName?: string
): Promise<ExtractedBeanInfo> {
  if (!apiKey) {
    console.log('[AI:research] API key not configured')
    return {}
  }

  const searchQuery = roasterName
    ? `${roasterName} ${beanName} coffee beans`
    : `${beanName} coffee beans`

  console.log('[AI:research] Starting research:', { searchQuery, beanName, roasterName })

  const systemPrompt = `You are a coffee expert researcher. Search the web to find information about the specified coffee bean.
Return a JSON object with the following fields (omit fields if you cannot find reliable information):
- name: the coffee name/blend name
- roaster: the roasting company name
- origin: country of origin (e.g., "Ethiopia", "Colombia")
- region: specific region within the country (e.g., "Yirgacheffe", "Huila")
- farm: farm or producer name if specified
- variety: coffee variety (e.g., "Bourbon", "Gesha", "SL28")
- process: processing method, must be one of: "washed", "natural", "honey", "anaerobic", "wet_hulled", "carbonic_maceration", "other"
- roastLevel: one of "light", "medium_light", "medium", "medium_dark", "dark"
- notes: ALL flavor descriptions, tasting notes, and flavor profiles. Format as "Tasting notes: [notes]". Include any cupping scores, SCA scores, or quality descriptors.

Only include fields where you find reliable information from coffee roaster websites, coffee review sites, or specialty coffee databases.
Return ONLY valid JSON, no markdown code blocks.`

  const stream = chat({
    adapter: openaiText(researchModel, apiKey, { baseURL }),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Search for information about this coffee: "${searchQuery}"`,
      },
    ],
    tools: [webSearchTool({ type: "web_search" })],
  })

  let content = ""
  let toolCallCount = 0
  let toolResultCount = 0

  for await (const chunk of stream) {
    console.log('[AI:research] Chunk:', chunk.type)

    if (chunk.type === 'TOOL_CALL') {
      toolCallCount++
      console.log('[AI:research] Tool invoked:', chunk.toolName)
    }

    if (chunk.type === 'TOOL_RESULT') {
      toolResultCount++
      console.log('[AI:research] Tool result received:', {
        hasError: !!chunk.error,
        resultLength: chunk.result?.length || 0,
      })
      if (chunk.error) {
        console.error('[AI:research] Tool error:', chunk.error)
      }
    }

    if (chunk.type === 'TEXT_MESSAGE_CONTENT') {
      content = chunk.content
    }
  }

  console.log('[AI:research] Stream done:', {
    toolCalls: toolCallCount,
    toolResults: toolResultCount,
    contentLength: content.length,
  })

  if (!content) {
    console.log('[AI:research] Empty response')
    return {}
  }

  try {
    const result = JSON.parse(content) as ExtractedBeanInfo
    console.log('[AI:research] Parsed:', Object.keys(result))
    return result
  } catch (error) {
    console.error('[AI:research] Parse error:', {
      error: error instanceof Error ? error.message : String(error),
      preview: content.substring(0, 150),
    })
    return {}
  }
}
```

---

## Diagnostic Workflow

When research returns empty:

1. **Check logs for `[AI:research] Starting research`** → Confirms function was called
2. **Check for `[AI:research] Tool invoked: web_search`** → Did model decide to search?
   - If missing: Model didn't use the tool (prompt issue or model limitation)
3. **Check for `[AI:research] Tool result received`** → Did search return data?
   - If missing: Tool call failed (API issue, rate limit, etc.)
   - If present but `resultLength: 0`: Search returned no results for that query
4. **Check for `[AI:research] Stream done`** → Did stream complete?
   - If `contentLength: 0`: Model got results but returned empty response
5. **Check for `[AI:research] Parse error`** → Is model returning invalid JSON?
   - Check `preview` to see what was actually returned

---

## Expected Log Output (Success Case)

```
[AI:research] Starting research: { searchQuery: 'Intelligentsia House Blend coffee beans', beanName: 'House Blend', roasterName: 'Intelligentsia' }
[AI:research] Chunk: TOOL_CALL
[AI:research] Tool invoked: web_search
[AI:research] Chunk: TOOL_RESULT
[AI:research] Tool result received: { hasError: false, resultLength: 2847 }
[AI:research] Chunk: TEXT_MESSAGE_CONTENT
[AI:research] Stream done: { toolCalls: 1, toolResults: 1, contentLength: 342 }
[AI:research] Parsed: [ 'name', 'roaster', 'origin', 'notes' ]
```

---

## Expected Log Output (Failure Cases)

### Case 1: Tool Never Called
```
[AI:research] Starting research: { searchQuery: 'Unknown Bean' }
[AI:research] Chunk: TEXT_MESSAGE_CONTENT
[AI:research] Stream done: { toolCalls: 0, toolResults: 0, contentLength: 0 }
[AI:research] Empty response
```
**Fix:** Model isn't using the tool. Check system prompt clarity or model capability.

### Case 2: Tool Called But No Results
```
[AI:research] Starting research: { searchQuery: 'xyz123abc' }
[AI:research] Chunk: TOOL_CALL
[AI:research] Tool invoked: web_search
[AI:research] Chunk: TOOL_RESULT
[AI:research] Tool result received: { hasError: false, resultLength: 0 }
[AI:research] Chunk: TEXT_MESSAGE_CONTENT
[AI:research] Stream done: { toolCalls: 1, toolResults: 1, contentLength: 0 }
[AI:research] Empty response
```
**Fix:** Search query is too obscure. Try broader terms or different roaster/bean names.

### Case 3: Tool Error
```
[AI:research] Starting research: { searchQuery: 'Test' }
[AI:research] Chunk: TOOL_CALL
[AI:research] Tool invoked: web_search
[AI:research] Tool result received: { hasError: true, resultLength: 0 }
[AI:research] Tool error: Rate limit exceeded
[AI:research] Stream done: { toolCalls: 1, toolResults: 1, contentLength: 0 }
```
**Fix:** OpenAI API rate limit or quota issue. Check API usage.

### Case 4: Invalid JSON
```
[AI:research] Stream done: { toolCalls: 1, toolResults: 1, contentLength: 156 }
[AI:research] Parse error: { error: 'Unexpected token', preview: 'I found some information about...' }
```
**Fix:** Model returned prose instead of JSON. System prompt may need clarification.

---

## Implementation Notes

- **Log prefix `[AI:research]`** makes it easy to grep/filter in production logs
- **Avoid logging full content** (use `.substring(0, 200)` for previews) to keep logs readable
- **Track both `toolCallCount` and `toolResultCount`** to distinguish between "tool not called" vs "tool failed"
- **Log chunk types** to see the full agentic flow, not just final text
- **Conditional error logging** for tool errors (use `console.error` for failures)

---

## Next Steps

1. Add this instrumentation to `src/lib/ai.ts`
2. Run a research query and capture logs
3. Match output against the diagnostic workflow above
4. Adjust system prompt or query based on findings
