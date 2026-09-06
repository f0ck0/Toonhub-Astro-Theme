import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../modules/ai-seo/services/ai-seo-module"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [events] = await aiSeo.listAndCountAiUsageEvents({}, { take: 10000 })
  for (const event of events) {
    await aiSeo.deleteAiUsageEvents(event.id)
  }
  res.json({ deleted: events.length })
}
