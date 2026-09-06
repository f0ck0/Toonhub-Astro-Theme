import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/articles/:id/score — 立即评分
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const score = await aiSeo.scoreArticle(id)
  res.json({ score })
}
