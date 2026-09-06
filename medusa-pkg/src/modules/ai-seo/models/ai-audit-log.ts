import { model } from "@medusajs/framework/utils"

/**
 * 审计日志。对应 Spree 的 toonhub_ai_audit_logs。
 */
export const AiAuditLog = model.define("ai_audit_log", {
  id: model.id({ prefix: "aial" }).primaryKey(),
  action: model.text().searchable(),
  resource_type: model.text().nullable(),
  resource_id: model.text().nullable(),
  admin_email: model.text().nullable(),
  message: model.text().nullable(),
  metadata: model.json().nullable(),
})
