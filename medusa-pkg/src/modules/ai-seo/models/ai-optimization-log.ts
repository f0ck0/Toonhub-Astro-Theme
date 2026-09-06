import { model } from "@medusajs/framework/utils"

/**
 * 文章优化日志。对应 Spree 的 toonhub_ai_optimization_logs。
 */
export const AiOptimizationLog = model.define("ai_optimization_log", {
  id: model.id({ prefix: "aiol" }).primaryKey(),
  article_id: model.text().nullable(),
  content_score_id: model.text().nullable(),
  status: model.text().nullable(),
  before_score: model.number().default(0),
  after_score: model.number().default(0),
  attempt: model.number().default(0),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
})
