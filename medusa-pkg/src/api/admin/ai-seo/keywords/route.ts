import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [keywords, count] = await aiSeo.listAndCountSeoKeywords(
    {},
    { take: 1000, order: { priority: "DESC", updated_at: "DESC" } }
  )
  res.json({ keywords, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const keyword = await aiSeo.createSeoKeywords({
    keyword: String(body.keyword || ""),
    keyword_type: String(body.keyword_type || "primary"),
    locale: String(body.locale || "en"),
    priority: Number(body.priority) || 0,
    source: body.source ? String(body.source) : "manual",
    status: "new",
  })
  res.status(201).json({ keyword })
}
