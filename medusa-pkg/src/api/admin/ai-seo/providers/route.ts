import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"
import { SecretBox } from "../../../../modules/ai-seo/services/secret-box"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [providers, count] = await aiSeo.listAndCountAiProviders(
    {},
    { take: 100, order: { updated_at: "DESC" } }
  )
  res.json({
    providers: providers.map((p) => ({
      ...p,
      encrypted_api_key: undefined,
      api_key_masked: SecretBox.mask(SecretBox.decrypt(p.encrypted_api_key)),
    })),
    count,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const provider = await aiSeo.createAiProviders({
    name: String(body.name || "AI Provider"),
    provider_type: String(body.provider_type || "openai"),
    base_url: body.base_url ? String(body.base_url) : null,
    default_model: body.default_model ? String(body.default_model) : null,
    encrypted_api_key: body.api_key ? SecretBox.encrypt(String(body.api_key)) : null,
    enabled: body.enabled !== false,
  })
  res.status(201).json({ provider })
}
