import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/keywords/clear — 清空关键词
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [keywords] = await aiSeo.listAndCountSeoKeywords({}, { take: 10000 })
  for (const keyword of keywords) {
    await aiSeo.deleteSeoKeywords(keyword.id)
  }
  res.json({ deleted: keywords.length })
}
