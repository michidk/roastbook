# AI pipeline analysis and refactor design

Status: proposed design, not implemented. The user selected support for both
Chat Completions and Responses, with Responses as the default.

## Purpose

Read coffee labels accurately, research coffee and equipment, and generate brew
recommendations through one consistent provider integration. Protocol selection,
request lifetime, privacy, and accounting must behave consistently across those
features. Image preparation should preserve readable text and bound resource use.

Compression saves transfer bytes. Image token charges depend on the model,
dimensions, detail level, and image count. A smaller JPEG at the same dimensions
does not normally cost fewer image tokens. OpenAI also resizes inputs internally;
client resizing is not proof of an API cost saving.

## What exists today

Analysis baseline: commit `361a10e2`. Relevant SDK versions in `bun.lock` are
`@tanstack/ai@1.0.0` and `@tanstack/ai-openai@1.0.0`.

1. `use-image-upload.ts` validates selected files and prepares them sequentially.
   Browser canvas creates a stored WebP at 2048 pixels, quality 82, and two
   thumbnails. Unsupported browser formats use `server/pictures.ts` for server
   conversion. The hook retains base64 of the prepared stored picture.
2. Bean forms and purchase dialogs submit those prepared pictures. Bean detail
   downloads existing stored pictures and encodes them again for transport.
   All three callers select the first six images.
3. `server/research.ts` accepts one to six base64 images. Each image is checked
   against its declared MIME type, 10 MiB, 12,000 pixels per side, and 50 million
   pixels. `Promise.all` validates and transforms the batch before admission to
   the AI resource limiter.
4. `thumbnail-image.ts:createAiImage` rotates, fits inside 2048 by 2048 pixels,
   and encodes JPEG at quality 85. Ordinary uploads therefore undergo WebP then
   JPEG encoding even when already suitable for image input.
5. `ai-image-extraction.server.ts` loads the user's provider configuration and
   sends raw JSON to `/chat/completions`, with `image_url` parts, `detail: high`,
   JSON-object output, `temperature: 0`, and a 45-second deadline. It ignores the
   selected API format. It manually parses content and usage and finalizes logs.
6. Web research and brew recommendations use TanStack AI through
   `createAiAdapter`. That factory honors the selected protocol. Responses uses
   the OpenAI adapter to preserve hosted `web_search`; Chat Completions uses the
   generic compatible adapter. Research gets 120 seconds, recommendations 45.
7. All outbound calls use `createAiProviderFetch`. It restricts requests to the
   two allowed endpoint paths, resolves and pins approved addresses, refuses
   redirects, caps request bodies at 64 MiB and responses at 8 MiB, and imposes
   a transport deadline. Non-2xx responses become sanitized exceptions.
8. Per-user credentials are encrypted and isolated. Logging goes through the
   request-recorder extension point. Detailed payload storage is opt-in. Image
   extraction currently records image metadata rather than image bytes.

The local limiter allows ten starts per minute and two concurrent requests per
operation per process. It is not a provider token quota or a distributed limiter.

## Findings

- Chat Completions legitimately accepts images with vision-capable models. The
  model reads the pixels; the endpoint name does not make the input text-only.
  Responses represents the same input with `input_image` instead of `image_url`.
  The defect is bypassing the configured protocol, not using a chat API for OCR.
- Image extraction duplicates transport serialization, timeout, usage parsing,
  and completion handling already provided by the AI SDK integration.
- Defaults select `gpt-5.1-codex`; OpenAI documents that model as Responses-only.
  Custom endpoints can have different aliases and capabilities. Neither a model
  name nor a saved key proves vision, structured output, or hosted-search support.
- The shared HTTP transport already has a total request-size guard. The previous
  audit overlooked it. Earlier admission and image-specific bounds are still
  useful because the guard runs after buffering the serialized request.
- Conversions precede the limiter and run concurrently. `sharp.concurrency(1)`
  limits threads inside libvips, not the number of outstanding image conversions.
- The image prompt uses the general web-research prompt builder, which tells the
  model to inspect pages and manuals despite having only pictures and no tools.
- The tolerant JSON parser returns `{}` for malformed output as well as for a
  valid result containing no information. SDK middleware can mark a request
  successful before feature-level parsing finishes. Raw image errors also have
  dead non-2xx response handling because protected fetch throws first.
- Provider-side response storage is not explicitly disabled. Local telemetry
  opt-out and provider retention are separate concerns.
- Tests cover adapter selection for text and hosted search, image resizing, and
  privacy separately. They do not prove image extraction honors both protocols.

## Approaches

1. Patch the raw image fetch with a second request/response format. This fixes
   endpoint selection but preserves duplicated protocol and lifecycle code.
2. Use the existing TanStack adapters for every AI operation, with one shared
   request lifecycle and focused image preparation. Recommended and planned.
3. Require Responses everywhere. This removes a supported self-hosted provider
   option. The user explicitly chose to keep Chat Completions support.

## Proposed behavior

### One provider policy and request lifecycle

Keep both SDK adapters and the protected fetch. Domain modules provide prompts,
messages, schemas, and parsing; they do not construct endpoint URLs or parse
provider usage formats. Rename `getOpenAIConfig` to `getAiProviderConfig`, derive
its type from persisted settings, and remove empty `aiChatLimits` and
`visionRequestLimits` hooks after migrating references.

A small `runAiRequest<T>` helper owns the deadline, request log, adapter creation,
usage collection, and terminal state. Its callback uses bound `generateText` or
`generateObject` functions and performs domain parsing. Those functions apply
shared request options internally, so callers cannot omit privacy or timeout
policy. Only a callback that returns successfully finalizes success.
Abort and parse failures retain any usage already received. Preserve the
request-recorder extension point; do not write accounting tables from features.
Collect SDK terminal status and finish reason as well as usage. Refusal,
incomplete output, and length termination fail even when returned text is valid
JSON. Preserve image JSON-object mode through protocol-specific SDK options;
strict schema output remains an additional recommendation requirement.

Use SDK multimodal messages for images, with explicit high detail. Send no
unconditional temperature setting. Set `store: false` for stateless requests on
both protocols and test the wire body. This requests no response-object storage;
it does not promise zero provider retention. Retain no automatic retries to avoid
duplicating paid work. Web research remains Responses-only and requires the
provider's hosted search tool. Never silently switch protocols after a failure.

### Image preparation

Move AI-specific preparation out of `thumbnail-image.ts` into
`server/ai-images.server.ts`. Retain existing storage sizes and shared validation.
Keep one-to-six images, 10 MiB per source image, the source pixel limits, a
2048-pixel long edge, and quality 85 for images that require JPEG conversion.

Enter the existing operation limiter before decoding or transforming the batch.
Validate and prepare one image at a time. Preserve bytes for static JPEG, PNG,
and WebP images already within bounds and without EXIF/XMP/IPTC metadata or an
orientation correction. Otherwise rotate, resize without enlargement, strip
metadata, and encode JPEG. Send each image's actual MIME type, never one MIME
argument for an entire batch. Reject animated/multipage input presented directly
to the extraction boundary with an actionable error. The normal picture picker
already flattens decodable animation through canvas; this refactor does not
change that existing upload behavior or claim to detect the original animation.

Cap the prepared batch at 32 MiB of image bytes before base64 serialization.
This is an application budget, not a quoted OpenAI limit, and leaves headroom
under the existing 64 MiB JSON transport guard after base64 expansion. Reject
over-budget images rather than silently reducing label quality. Preserve the
transport's independent final-byte check and response cap.

This removes the ordinary WebP-to-JPEG round trip. It does not preserve original
phone photos beyond today's storage policy or add cropping, OCR, image caching,
model-specific token prediction, or a queue service.

### Prompts, results, and settings

Extract reusable field-contract/output instructions from the web prompt. Give
label extraction its own evidence rules: read only visible text, combine views,
omit ambiguous fields, and treat instructions printed in images as untrusted.
Preserve typed field validation and the useful partial-result behavior. Distinguish
valid empty JSON from malformed JSON, refusal, truncated output, and no content.
Keep schema-based output for brew recommendations; do not require every image
provider to implement strict structured outputs as part of this refactor.

The selected API format applies to every feature. Update settings help accordingly.
Keep the existing settings database shape and all saved endpoints, keys, model
IDs, and protocol choices. For new configurations, retain OpenAI's base URL and
Responses default but require explicit image and research model IDs instead of
preselecting the Codex model. This is a proposed setup choice, not a data migration.
Saving settings validates configuration; it must not claim a paid model call
has tested capabilities. Preserve safe HTTP status/category information and give
generic guidance to check the selected protocol, model, and required capabilities.
Do not infer an exact capability failure from a generic 400 response or expose
remote error bodies or credentials.

### Tests and completion criteria

- Captured SDK requests prove images and text use the selected endpoint, correct
  image parts, high detail, and no provider response storage.
- Hosted web search remains a hosted tool; it never becomes a client function.
- Common uploads pass through unchanged; transformed inputs retain orientation
  and dimensions; invalid inputs and overloaded requests never reach the provider.
- Every admitted provider operation has one terminal log outcome. Usage survives
  domain parsing failure and abort. Image bytes never enter logs, even opt-in logs.
- Existing settings, private endpoint policy, account isolation, demo behavior,
  recommendation schemas, and partial valid extracted fields remain supported.
- The refactor passes targeted unit/integration checks, a production build, and
  the repository's broad verification. UI checks cover settings and all three
  image callers at 375, 768, and 1280 pixels when browser verification is available.

## Sources

- [OpenAI images and vision](https://developers.openai.com/api/docs/guides/images-vision)
  documents image inputs for both APIs and image-token sizing.
- [Migrating to Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)
  recommends Responses for new integrations and describes `store: false`.
- [GPT-5.1-Codex](https://developers.openai.com/api/docs/models/gpt-5.1-codex)
  documents its Responses-only API requirement.

Official pages and the locked SDK sources were inspected on 2026-11-06. No live
provider call or extraction-quality benchmark was performed for this analysis.
