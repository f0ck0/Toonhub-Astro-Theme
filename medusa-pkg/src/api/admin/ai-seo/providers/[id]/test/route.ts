import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../../modules/ai-seo/services/ai-seo-module"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const result = await aiSeo.testProvider(id)
  res.json({ result })
}
