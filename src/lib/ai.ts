import { chat } from "@tanstack/ai"
import {
  OPENAI_CHAT_MODELS,
  createOpenaiChat,
  type OpenAIChatModel,
} from "@tanstack/ai-openai"
import { webSearchTool } from "@tanstack/ai-openai/tools"

const apiKey = process.env.OPENAI_API_KEY
const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
function isOpenAIChatModel(model: string): model is OpenAIChatModel {
  return (OPENAI_CHAT_MODELS as ReadonlyArray<string>).includes(model)
}

function resolveModel(
  envValue: string | undefined,
  fallback: OpenAIChatModel,
): OpenAIChatModel {
  return envValue && isOpenAIChatModel(envValue) ? envValue : fallback
}

const visionModel = resolveModel(process.env.OPENAI_VISION_MODEL, "gpt-4o")
const researchModel = resolveModel(process.env.OPENAI_RESEARCH_MODEL, "gpt-4o")

function createAdapter(model: OpenAIChatModel) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  return createOpenaiChat(model, apiKey, { baseURL })
}

export function isVisionEnabled(): boolean {
  return !!apiKey
}

export function isResearchEnabled(): boolean {
  return !!apiKey
}

export interface ExtractedBeanInfo {
  name?: string
  roaster?: string
  origin?: string
  region?: string
  farm?: string
  variety?: string
  process?: string
  roastLevel?: "light" | "medium_light" | "medium" | "medium_dark" | "dark"
  roastDate?: string
  notes?: string
}

export async function extractBeanInfoFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ExtractedBeanInfo> {
  if (!apiKey) {
    return {}
  }

  const systemPrompt = `You are a coffee expert assistant. Extract coffee bean information from product images (bags, labels, packaging).
Return a JSON object with the following fields (omit fields if not visible/readable):
- name: the coffee name/blend name
- roaster: the roasting company name
- origin: country of origin (e.g., "Ethiopia", "Colombia")
- region: specific region within the country (e.g., "Yirgacheffe", "Huila")
- farm: farm or producer name if specified
- variety: coffee variety (e.g., "Bourbon", "Gesha", "SL28")
- process: processing method, must be one of: "washed", "natural", "honey", "anaerobic", "wet_hulled", "carbonic_maceration", "other"
- roastLevel: one of "light", "medium_light", "medium", "medium_dark", "dark"
- roastDate: roast date in ISO format (YYYY-MM-DD) if visible
- notes: ALL flavor descriptions, tasting notes, and flavor profiles go here. Format as "Tasting notes: [notes]" if tasting notes are found. Include any cupping scores, SCA scores, or quality descriptors.

Only include fields where you can clearly read the information. Do not guess.
Return ONLY valid JSON, no markdown code blocks.`

  const content = await chat({
    adapter: createAdapter(visionModel),
    systemPrompts: [systemPrompt],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "data",
              value: imageBase64,
              mimeType,
            },
          },
          {
            type: "text",
            content: "Extract the coffee bean information from this image.",
          },
        ],
      },
    ],
    stream: false,
  })

  if (!content) {
    return {}
  }

  try {
    return JSON.parse(content) as ExtractedBeanInfo
  } catch {
    return {}
  }
}

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

  console.info("[AI research] search query", {
    beanName,
    roasterName: roasterName ?? null,
    searchQuery,
    model: researchModel,
  })

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

  const content = await chat({
    adapter: createAdapter(researchModel),
    systemPrompts: [systemPrompt],
    messages: [
      {
        role: "user",
        content: `Search for information about this coffee: "${searchQuery}"`,
      },
    ],
    tools: [webSearchTool({ type: "web_search" })],
    stream: false,
  })

  console.info("[AI research] stream complete", {
    hasContent: content.length > 0,
    preview: content.slice(0, 300),
  })

  if (!content) {
    console.warn("[AI research] empty content")
    return {}
  }

  try {
    return JSON.parse(content) as ExtractedBeanInfo
  } catch {
    console.warn("[AI research] failed to parse JSON", {
      preview: content.slice(0, 300),
    })
    return {}
  }
}
