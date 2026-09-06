import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_SEO_MODULE } from "../../../../../../modules/ai-seo"
import type { AiSeoModuleService } from "../../../../../../modules/ai-seo/services/ai-seo-module"

/**
 * POST /admin/ai-seo/integrations/:id/test — 测试集成连接
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const aiSeo = req.scope.resolve(AI_SEO_MODULE) as AiSeoModuleService
  const { id } = req.params as { id: string }
  const integration = await aiSeo.retrieveApiIntegration(id)
  const base = (integration.base_url || "https://toonhubshop.com").replace(/\/+$/, "")
  let message = "Integration settings saved"
  let status = "ok"
  try {
    const res2 = await fetch(`${base}/api/v3/store/products?per_page=1`)
    if (res2.ok) {
      const json = (await res2.json()) as { data?: unknown[] }
      message = `Store API OK, products returned: ${Array.isArray(json.data) ? json.data.length : 0}`
    } else {
      status = "failed"
      message = `Store API responded with ${res2.status}`
    }
  } catch (error) {
    status = "failed"
    message = error instanceof Error ? error.message : String(error)
  }
  await aiSeo.updateApiIntegrations({ id: id,  last_test_status: status, last_test_message: message.slice(0, 500), last_tested_at: new Date() })
  res.json({ status, message })
}
