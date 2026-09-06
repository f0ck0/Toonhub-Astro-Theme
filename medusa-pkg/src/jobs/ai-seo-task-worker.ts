import { AI_SEO_MODULE } from "../modules/ai-seo"
import { TRANSLATION_MODULE } from "@medusajs/translation"

/**
 * AI SEO 任务 Worker:每 1 分钟轮询一次 queued 任务并执行。
 * 替代 Spree 版的 Sidekiq/ActiveJob 队列。
 * 用法见 src/jobs/README.md:默认导出处理函数 + config 对象。
 */
export default async function aiSeoTaskWorker(container: { resolve: (key: string) => unknown }) {
  const aiSeo = container.resolve(AI_SEO_MODULE) as {
    listAndCountAiTasks: (filters: Record<string, unknown>, config: { take: number; order: Record<string, string> }) => Promise<[Array<{ id: string; scheduled_at: string | null }>, number]>
    runTask: (id: string, deps: { translationService: unknown }) => Promise<unknown>
  }
  const translationModule = container.resolve(TRANSLATION_MODULE)

  const [tasks, count] = await aiSeo.listAndCountAiTasks(
    { status: "queued" },
    { take: 10, order: { created_at: "ASC" } }
  )
  if (!count) return

  for (const task of tasks) {
    // 定时任务未到时间则跳过(等待下次轮询)
    if (task.scheduled_at && new Date(task.scheduled_at).getTime() > Date.now()) {
      continue
    }
    try {
      await aiSeo.runTask(task.id, { translationService: translationModule })
    } catch (error) {
      // runTask 内部已处理失败/重试;这里兜底避免 worker 崩溃
      console.error(`[ai-seo-worker] runTask ${task.id} crashed:`, error)
    }
  }
}

export const config = {
  name: "ai-seo-task-worker",
  schedule: "*/1 * * * *", // 每分钟
}
