# AI Pipeline Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make image extraction, research, and recommendations honor one provider
configuration and share reliable execution, while avoiding unnecessary image loss.

**Architecture:** Retain the existing TanStack Responses and Chat Completions
adapters behind the protected HTTP transport. Add one request-lifecycle helper
and one focused image-preparation module; keep domain prompts and parsing in
their existing feature files.

**Tech Stack:** Bun, TypeScript, TanStack AI 1.0, Zod, Sharp, TanStack Start,
Drizzle/PostgreSQL, React.

**Spec:** [Analysis and proposed design](../specs/2026-11-06-ai-pipeline-design.md).
This is a planning deliverable, not authorization to begin implementation.

## Global constraints

- Support both API formats; Responses is the default. Never silently fall back.
- Preserve saved provider credentials, model IDs, endpoint choices, and image data.
- Keep protected fetch, encryption, account isolation, and recorder extension points.
- Image source limits stay at six images, 10 MiB each, 12,000 pixels per side,
  and 50 million pixels. Prepared images stay within 2048 pixels per side.
- JPEG fallback quality is 85; the prepared-batch budget is 32 MiB of image bytes.
- Preserve 45-second inference deadlines for labels/recommendations and 120 seconds
  for research. Keep the 64 MiB transport request and 8 MiB response limits.
- Do not claim compression reduces model billing without measured token usage.
- Use Bun and the committed lockfile. No new AI SDK or browser dependencies.
- Before changing existing exported signatures, find references through the LSP.
- Load relevant TanStack intent references with `bunx @tanstack/intent@latest load`
  before changing server-function or execution boundaries.
- Follow repository verification and signed GitHub App publication rules, including
  required co-authors. Do not automatically create a pull request.

## Review focus

- A provider supports images through only the selected protocol. Task 1 verifies
  image requests on both protocols and absence of fallback.
- Private image bytes reach opt-in telemetry through multimodal messages. Task 2
  checks all recorder payloads and console output with a unique image marker.
- A successful HTTP response contains refusal, invalid JSON, or truncated output.
  Tasks 2 and 4 verify failure state with retained usage and valid-empty distinction.
- Six large inputs arrive while another extraction runs. Task 3 checks admission
  before conversion, sequential preparation, aggregate bounds, and permit release.
- Existing custom settings or a Chat Completions-only installation stop working.
  Task 5 verifies persistence, feature availability, and both protocol flows.

## File responsibilities

- `src/lib/server/ai-runtime.server.ts`: provider loading and adapter selection.
- New `src/lib/server/ai-request.server.ts`: request lifetime and SDK execution
  context.
- New `src/lib/server/ai-images.server.ts`: validated prepared images and batch
  limits.
- Existing image, research, and recommendation modules: domain prompts and results.
- `src/lib/structured-research.ts`: shared field/output contract and JSON decoding.
- Existing request-recorder and logging modules: privacy, usage, and terminal records.
- Existing settings UI/contracts: honest defaults and protocol help.

Avoid moving all AI files into a new directory during this change. The responsibility
changes above are sufficient; unrelated import churn would not improve behavior.

## Task 1: Prove and centralize protocol selection

**Files:** `src/lib/server/ai-runtime.server.ts`, its existing test,
`src/lib/server/ai-provider-fetch.server.ts`, and
`src/lib/server/ai-provider-security.server.test.ts`.

**Interfaces:** Rename `getOpenAIConfig()` to `getAiProviderConfig()` and export
`AiProviderConfig = Awaited<ReturnType<typeof getAiProviderConfig>>`.
Keep `createAiAdapter(model: string, config: AiProviderConfig)` as the sole adapter
factory, with inferred return type. Migrate all references in the same task.

- [ ] Extend the existing captured-request tests to send two actual tiny image
  fixtures through `chat()` and the real adapters, with explicit high detail.
  Assert `/responses` plus `input_image`, and `/chat/completions` plus `image_url`.
  Assert correct MIME/data, preserved ordering, text prompt, and model.
- [ ] Add wire assertions for `store: false`, no unconditional temperature,
  no protocol fallback on error, and hosted `web_search` staying a hosted tool.
- [ ] Keep the native Responses adapter for hosted tools and the compatible
  Chat Completions adapter. Use their existing multimodal support. Keep the
  dynamic model-name assertion, if required by the SDK, isolated in this factory;
  document that type compatibility is not capability validation.
- [ ] Verify responses, images, and recommendation schema requests all use the
  protected fetch. Preserve DNS pinning, redirect refusal, and both byte limits.
- [ ] Run `bun test src/lib/server/ai-runtime.server.test.ts
  src/lib/server/ai-provider-security.server.test.ts`, then `bun run check`
  and `bun run typecheck`. All must pass before the next task.

## Task 2: One request lifecycle for every AI feature

**Files:** new `src/lib/server/ai-request.server.ts` and test;
`src/lib/server/ai-image-extraction.server.ts`,
`src/lib/server/ai-web-research.server.ts`,
`src/lib/server/ai-brew-recommendation.server.ts`,
`src/lib/server/ai-request-logs.server.ts`, its unit/integration tests,
`src/extension-points/ai-request-recorder.server.ts`, and `scripts/test-ai-privacy.ts`.

**Interfaces:** `runAiRequest<T>(options: AiRequestOptions<T>): Promise<T>`.
Options contain the resolved config, model, request type, timeout milliseconds,
safe log metadata, and `execute(context): Promise<T>`. Context supplies bound
`generateText(input: AiTextInput): Promise<string>` and
`generateObject<TSchema extends z.ZodType>(input: AiObjectInput<TSchema>):
Promise<z.output<TSchema>>`. Both inputs take SDK-typed messages/system prompts;
text input also accepts tools and `format: 'text' | 'json-object'`, while object
input takes `outputSchema: TSchema`. Derive types from SDK options. Keep the
adapter, controller, middleware, and shared model options inside these functions.

- [ ] Add tests for successful output, thrown parsing error after usage arrives,
  provider error, timeout, and setup failure after log creation. Each operation
  produces exactly one final outcome; aborts are recorded as aborted. Collect
  finish reason, refusal, and error/abort status as well as usage; reject length
  termination even when the model returned syntactically valid JSON.
- [ ] Implement the helper around the existing recorder extension point. Collect
  usage in memory during SDK execution and finalize only after `execute` returns.
  Extend failure/abort recorder inputs to retain accumulated usage. Keep any
  compatibility exports required by edition extensions until their callers migrate.
- [ ] Apply `store: false`, deadline, model, and collector internally in both
  generation functions. For JSON-object text output, map to Responses
  `text.format: { type: 'json_object' }` or Chat Completions
  `response_format: { type: 'json_object' }` through SDK model options. Image
  extraction requests this mode; web research preserves its existing text mode.
  Test both wire formats without letting domain code construct provider bodies.
- [ ] Make logging metadata explicit and safe: image operations supply counts,
  byte sizes, dimensions, MIME types, and detail, never their message array. Text
  operations may supply prompts under the existing telemetry policy. Sanitize
  terminal event/error data as well as input metadata.
- [ ] Migrate all AI features to this helper. Replace the image module's raw
  fetch with an SDK multimodal request. Keep feature-specific parsing inside
  the callback so invalid output cannot be recorded as success.
- [ ] Remove redundant manual usage decoding, timeout code, non-2xx image-response
  parsing, and the empty runtime limit helpers after all references migrate.
- [ ] Test both protocols using a local fixture HTTP provider with realistic SDK
  event/response bodies, not mocked `chat()` results. Extend privacy coverage to
  assert no image marker or key appears in console or recorded payloads with
  detailed telemetry both enabled and disabled.
- [ ] Run targeted request/runtime/logging tests, `bun run check`, and
  `bun run typecheck`. Run the existing isolated database integration harness
  for recorder privacy and credential isolation.

## Task 3: Bound image preparation and preserve suitable inputs

**Files:** new `src/lib/server/ai-images.server.ts` and test;
`src/lib/server/research.ts`, `src/lib/server/ai-image-extraction.server.ts`,
`src/lib/thumbnail-image.ts`, `src/lib/thumbnail-image.test.ts`, and
`src/journal/domain/resource-limits.test.ts` if orchestration coverage belongs there.

**Interfaces:** `prepareAiImages(inputs: readonly AiImageInput[]):
Promise<readonly PreparedAiImage[]>`. Derive `AiImageInput` from the extraction
input schema. `PreparedAiImage` contains bytes, MIME type limited to JPEG/PNG/WebP,
width, and height; only the preparation module constructs it. Change extraction
to accept these objects, eliminating its batch-wide MIME parameter.

- [ ] Test byte-identical pass-through of static, metadata-free, bounded WebP,
  JPEG, and PNG. Test orientation, resizing, MIME spoofing, truncated image data,
  metadata stripping, unsupported formats, and direct animated/multipage input
  rejection with real Sharp-generated fixtures. Check metadata and dimensions.
  Existing browser flattening to static WebP is outside this rejection guarantee.
- [ ] Move AI encoding out of the thumbnail module. Reuse shared buffer validation.
  Convert only when needed and enforce the 32 MiB prepared-batch budget before
  base64 serialization. Keep the transport's final serialized-byte check.
- [ ] Move the existing extraction limiter around validation, preparation, and
  provider execution. Prepare sequentially. Add an admission test proving a
  rejected request performs zero conversions and provider calls, and a failure
  releases the concurrency permit.
- [ ] Ensure every caller retains six-image selection and existing source limits.
  Do not change stored photos, thumbnails, the browser journal, or image migrations.
- [ ] Run the image/preparation/orchestration tests plus `bun run check` and
  `bun run typecheck`. Use small fixtures; no uncontrolled large-image stress run.

## Task 4: Separate label evidence from web research and classify results

**Files:** `src/lib/structured-research.ts`, its test,
`src/lib/server/ai-research-fields.server.ts`, its test,
`src/lib/server/ai-image-extraction.server.ts`, and
`src/lib/server/ai-web-research.server.ts`.

**Interfaces:** Add `parseStructuredResearchResponse(content, fields)` returning
a discriminated result: `{ kind: 'valid', value }` or `{ kind: 'invalid-json' }`.
The valid branch retains the existing schema-derived partial result type. Migrate
callers and remove the old conflating parser. Add `buildBeanImageExtractionPrompt()`
using shared field descriptions and output rules, without web-research instructions.

- [ ] Test that image prompts contain visible-text and conflicting-label rules,
  reject instructions embedded in pictures, and contain no instruction to browse
  manuals or websites. Web prompts retain their existing evidence requirements.
- [ ] Preserve supported fenced/embedded JSON decoding and valid-field filtering.
  Assert that `{}` is valid empty extraction, malformed JSON is an error, and
  partially valid fields survive. Refusal, absent content, and incomplete/truncated
  SDK results fail before parsing and preserve usage in the common lifecycle.
- [ ] Keep image extraction compatible with image-capable providers that lack
  strict JSON-schema output. Do not add another model call to repair JSON.
- [ ] Run prompt/parser/extraction tests and the request-lifecycle tests, then
  `bun run check` and `bun run typecheck`.

## Task 5: Settings, documentation, and end-to-end verification

**Files:** `src/lib/ai-provider.ts`,
`src/components/settings/ai-provider-settings.tsx`,
`src/lib/server/ai-provider-settings.integration.test.ts`,
`docs/configuration.md`, `docs/upgrading.md`, `README.md`, and relevant existing
tests.

**Interfaces:** Keep persisted settings and server-function contracts unchanged.
New unsaved settings use Responses and explicit required model fields. Availability
checks mean configured eligibility, not a successful capability probe.

- [ ] Replace the Codex model defaults for new configurations with empty required
  model fields; give concise guidance to use provider-supported vision and research
  models. Update test fixtures to supply explicit models. Preserve saved IDs.
- [ ] Change help text so the selected protocol applies to labels and
  recommendations.
  Describe Responses hosted web search as an additional provider requirement.
  Explain missing configuration and safe status-based provider errors. For a
  generic 400, advise checking protocol/model capabilities without claiming an
  exact diagnosis. Saving settings does not contact or verify the model.
- [ ] Update configuration and upgrade documentation for protocol consistency,
  pass-through/conversion rules, image budgets, retention request, and explicit
  model selection. Update the README only for behavior actually shipped.
- [ ] Verify settings isolation and reconnect behavior with the integration harness.
  Exercise labels from the bean form, purchase dialog, and existing bean; validate
  research and recommendations with local fixture providers for both protocols.
- [ ] Run `bun run verify` and `bun run test:integration` with the repository's
  isolated PostgreSQL/S3 services. Inspect the production build's browser assets
  for accidental server/provider imports using the existing asset check.
- [ ] Follow the applicable browser-tool policy for settings/image-flow checks at
  375, 768, and 1280 pixels. Inspect console errors and failed requests. If browser
  execution is not available or authorized, report that coverage as outstanding.
- [ ] Before claiming quality or cost gains, run an explicitly authorized live
  evaluation with representative label photos. Compare extracted fields and actual
  reported usage; local fixtures prove contracts, not OCR accuracy or provider
  billing.
- [ ] Review the final diff and publish only implementation changes approved for
  execution, through the managed GitHub App with valid signatures and both required
  co-author trailers. Report unrun verification and remaining operational limits.

## Plan review and handoff

The interfaces above retain SDK-level messages and schema types, keep journal code
portable, and do not introduce a new database migration or a provider framework.
Each major risk in Review focus has an owning task and a concrete check.

Recommended execution is sequential in this session because adapter, lifecycle,
image preparation, and parsing changes share interfaces. Review the complete change
after all callers migrate. This plan intentionally stops before implementation.
