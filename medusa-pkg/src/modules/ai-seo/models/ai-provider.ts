import { model } from "@medusajs/framework/utils"

/**
 * AI 提供商(OpenAI / Azure / DeepSeek / OpenRouter / 任意 OpenAI 兼容接口)。
 * 对应 Spree 的 toonhub_ai_providers。
 */
export const AiProvider = model.define("ai_provider", {
  id: model.id({ prefix: "aipr" }).primaryKey(),
  name: model.text().searchable(),
  provider_type: model.text().searchable(),
  base_url: model.text().nullable(),
  default_model: model.text().nullable(),
  encrypted_api_key: model.text().nullable(),
  models_cache: model.json().nullable(),
  enabled: model.boolean().default(true),
  last_test_status: model.text().nullable(),
  last_test_message: model.text().nullable(),
  last_tested_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})
