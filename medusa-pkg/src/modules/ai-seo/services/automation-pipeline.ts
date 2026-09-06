/**
 * 自动化流水线。对应 Spree 的 Toonhub::AutomationPipeline。
 * queue_from_seed: 种子 → 关键词 → 文章 的循环任务;queue_for_products: 为无文章产品批量生成文章。
 */
export interface AutomationPayload {
  seed?: string
  locale?: string
  publish_mode?: string
  scheduled_at?: string | null
  keyword_count?: number
  limit?: number
}

export interface TaskCreator {
  (taskType: string, payload: AutomationPayload, providerId?: string | null, model?: string | null): Promise<{ id: string }>
}

export class AutomationPipeline {
  constructor(
    private readonly createTask: TaskCreator,
    private readonly providerId?: string | null,
    private readonly defaultModel?: string | null
  ) {}

  async queueFromSeed(params: AutomationPayload): Promise<{ id: string }> {
    return this.createTask(
      "automation_pipeline",
      {
        seed: params.seed || "anime figure collecting guide",
        locale: params.locale || "en",
        publish_mode: params.publish_mode || "draft",
        scheduled_at: params.scheduled_at || null,
        keyword_count: Number(params.keyword_count) || 30,
      },
      this.providerId,
      this.defaultModel
    )
  }

  async queueForProducts(params: AutomationPayload): Promise<{ id: string }> {
    return this.createTask(
      "product_article_generation",
      {
        limit: Number(params.limit) || 10,
        locale: params.locale || "en",
        publish_mode: params.publish_mode || "draft",
      },
      this.providerId,
      this.defaultModel
    )
  }
}
