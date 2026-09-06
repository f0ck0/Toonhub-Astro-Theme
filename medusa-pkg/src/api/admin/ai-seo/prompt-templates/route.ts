import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [templates, count] = await aiSeo.listAndCountAiPromptTemplates(
    {},
    { take: 500, order: { position: "ASC" } }
  )
  res.json({ templates, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const template = await aiSeo.createAiPromptTemplates({
    name: String(body.name || "Template"),
    template_type: String(body.template_type || "article"),
    locale: String(body.locale || "en"),
    system_prompt: body.system_prompt ? String(body.system_prompt) : null,
    user_prompt: body.user_prompt ? String(body.user_prompt) : null,
    enabled: body.enabled !== false,
    position: Number(body.position) || 0,
  })
  res.status(201).json({ template })
}
