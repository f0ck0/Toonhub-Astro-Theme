import { model } from "@medusajs/framework/utils"

/**
 * AI 用量/成本事件。对应 Spree 的 toonhub_ai_usage_events。
 */
export const AiUsageEvent = model.define("ai_usage_event", {
  id: model.id({ prefix: "aiue" }).primaryKey(),
  provider_id: model.text().nullable(),
  task_id: model.text().nullable(),
  operation: model.text().nullable(),
  model: model.text().nullable(),
  prompt_tokens: model.number().default(0),
  completion_tokens: model.number().default(0),
  total_tokens: model.number().default(0),
  estimated_cost: model.number().default(0),
  metadata: model.json().nullable(),
})
