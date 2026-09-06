import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [events, count] = await aiSeo.listAndCountAiUsageEvents(
    {},
    { take: 1000, order: { created_at: "DESC" } }
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEvents = events.filter((e) => e.created_at && new Date(e.created_at) >= today)
  const todayTokens = todayEvents.reduce((sum, e) => sum + (e.total_tokens || 0), 0)
  const todayCost = todayEvents.reduce((sum, e) => sum + (e.estimated_cost || 0), 0)

  res.json({
    events,
    count,
    today_tokens: todayTokens,
    today_cost: Math.round(todayCost * 100) / 100,
  })
}
