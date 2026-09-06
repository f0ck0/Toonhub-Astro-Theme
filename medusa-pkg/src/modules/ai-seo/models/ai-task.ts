import { model } from "@medusajs/framework/utils"

/**
 * 异步任务队列。对应 Spree 的 toonhub_ai_tasks。
 * status: queued | running | completed | failed | retrying | cancelled
 */
export const AiTask = model
  .define("ai_task", {
    id: model.id({ prefix: "aitk" }).primaryKey(),
    task_type: model.text().searchable(),
    status: model.text().default("queued").searchable(),
    payload: model.json().nullable(),
    result: model.text().nullable(),
    error_message: model.text().nullable(),
    model: model.text().nullable(),
    attempts: model.number().default(0),
    max_attempts: model.number().default(3),
    started_at: model.dateTime().nullable(),
    finished_at: model.dateTime().nullable(),
    scheduled_at: model.dateTime().nullable(),
    article_id: model.text().nullable(),
    provider_id: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_ai_task_status",
      on: ["status"],
    },
    {
      name: "IDX_ai_task_type",
      on: ["task_type"],
    },
  ])
