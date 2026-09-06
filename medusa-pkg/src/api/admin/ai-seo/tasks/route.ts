import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const status = req.query.status as string | undefined
  const filters = status ? { status } : {}
  const [tasks, count] = await aiSeo.listAndCountAiTasks(
    filters,
    { take: 500, order: { created_at: "DESC" } }
  )
  res.json({ tasks, count })
}
