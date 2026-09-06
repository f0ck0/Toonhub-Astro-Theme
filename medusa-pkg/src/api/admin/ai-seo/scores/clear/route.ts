import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/scores/clear — 清空评分记录
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [scores] = await aiSeo.listAndCountAiContentScores({}, { take: 10000 })
  for (const score of scores) {
    await aiSeo.deleteAiContentScores(score.id)
  }
  res.json({ deleted: scores.length })
}
