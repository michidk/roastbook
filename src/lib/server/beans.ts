import { createServerFn } from "@tanstack/react-start"
import { db } from "@/db"
import { beans } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import {
  isVisionEnabled,
  isResearchEnabled,
  extractBeanInfoFromImage,
  researchBeanFromWeb,
  type ExtractedBeanInfo,
} from "@/lib/ai"

export const getBeans = createServerFn({ method: "GET" }).handler(async () => {
  return db.query.beans.findMany({
    orderBy: [desc(beans.createdAt)],
    with: {
      images: true,
    },
  })
})

export const getBean = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    return db.query.beans.findFirst({
      where: eq(beans.id, id),
      with: {
        images: true,
        roasterRef: true,
      },
    })
  })

export const getActiveBeans = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.query.beans.findMany({
      where: eq(beans.isArchived, false),
      orderBy: [desc(beans.createdAt)],
      with: {
        images: true,
      },
    })
  }
)

export const createBean = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string
      roaster?: string
      roasterId?: number
      origin?: string
      region?: string
      farm?: string
      variety?: string
      process?: string
      roastLevel?: "light" | "medium_light" | "medium" | "medium_dark" | "dark"
      roastDate?: Date
      weight?: string
      price?: string
      priceCurrency?: string
      shopUrl?: string
      notes?: string
    }) => data
  )
  .handler(async ({ data }) => {
    const [bean] = await db.insert(beans).values(data).returning()
    return bean
  })

export const updateBean = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: number
      name?: string
      roaster?: string
      roasterId?: number | null
      origin?: string
      region?: string
      farm?: string
      variety?: string
      process?: string
      roastLevel?:
        | "light"
        | "medium_light"
        | "medium"
        | "medium_dark"
        | "dark"
        | null
      roastDate?: Date | null
      weight?: string | null
      price?: string | null
      priceCurrency?: string | null
      shopUrl?: string | null
      notes?: string
      isArchived?: boolean
    }) => data
  )
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const [bean] = await db
      .update(beans)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(beans.id, id))
      .returning()
    return bean
  })

export const deleteBean = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    await db.delete(beans).where(eq(beans.id, id))
  })

export const checkVisionEnabled = createServerFn({ method: "GET" }).handler(
  async () => {
    return { enabled: isVisionEnabled() }
  }
)

export const extractBeanInfo = createServerFn({ method: "POST" })
  .validator((data: { imageBase64: string; mimeType: string }) => data)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!isVisionEnabled()) {
      throw new Error("OpenAI vision is not configured")
    }
    return extractBeanInfoFromImage(data.imageBase64, data.mimeType)
  })

export const checkResearchEnabled = createServerFn({ method: "GET" }).handler(
  async () => {
    return { enabled: isResearchEnabled() }
  }
)

export const researchBeanInfo = createServerFn({ method: "POST" })
  .validator((data: { beanName: string; roasterName?: string }) => data)
  .handler(async ({ data }): Promise<ExtractedBeanInfo> => {
    if (!isResearchEnabled()) {
      throw new Error("OpenAI research is not configured")
    }

    console.info("[Bean research] request", {
      beanName: data.beanName,
      roasterName: data.roasterName ?? null,
    })

    return researchBeanFromWeb(data.beanName, data.roasterName)
  })
