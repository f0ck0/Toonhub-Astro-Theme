import { model } from "@medusajs/framework/utils"

/**
 * 外部 API 集成凭据(对接 storefront)。对应 Spree 的 toonhub_spree_api_integrations。
 */
export const ApiIntegration = model.define("api_integration", {
  id: model.id({ prefix: "aiin" }).primaryKey(),
  name: model.text().searchable(),
  base_url: model.text().nullable(),
  encrypted_token: model.text().nullable(),
  encrypted_external_api_token: model.text().nullable(),
  enabled: model.boolean().default(true),
  last_test_status: model.text().nullable(),
  last_test_message: model.text().nullable(),
  last_tested_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})
