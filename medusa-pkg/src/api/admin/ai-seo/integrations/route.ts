import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../modules/ai-seo/services/ai-seo-module"
import { SecretBox } from "../../../../modules/ai-seo/services/secret-box"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const [integrations, count] = await aiSeo.listAndCountApiIntegrations(
    {},
    { take: 100, order: { name: "ASC" } }
  )
  res.json({
    integrations: integrations.map((i) => ({
      ...i,
      encrypted_token: undefined,
      encrypted_external_api_token: undefined,
      token_masked: SecretBox.mask(SecretBox.decrypt(i.encrypted_token)),
      external_api_token_masked: SecretBox.mask(SecretBox.decrypt(i.encrypted_external_api_token)),
    })),
    count,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const body = (req.body || {}) as Record<string, unknown>
  const integration = await aiSeo.createApiIntegrations({
    name: String(body.name || "API Integration"),
    base_url: body.base_url ? String(body.base_url) : null,
    encrypted_token: body.token ? SecretBox.encrypt(String(body.token)) : null,
    encrypted_external_api_token: body.external_api_token ? SecretBox.encrypt(String(body.external_api_token)) : null,
    enabled: body.enabled !== false,
  })
  res.status(201).json({ integration })
}
