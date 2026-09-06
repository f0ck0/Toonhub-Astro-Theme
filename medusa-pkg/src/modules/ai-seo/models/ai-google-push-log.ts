import { model } from "@medusajs/framework/utils"

/**
 * Google 收录推送日志。对应 Spree 的 toonhub_google_push_logs。
 */
export const AiGooglePushLog = model.define("ai_google_push_log", {
  id: model.id({ prefix: "aigp" }).primaryKey(),
  article_id: model.text().nullable(),
  url: model.text().nullable(),
  push_type: model.text().nullable(),
  status: model.text().nullable(),
  message: model.text().nullable(),
  metadata: model.json().nullable(),
})
