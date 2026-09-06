import { MedusaService } from "@medusajs/framework/utils"
import { AiProvider } from "../models/ai-provider"
import { AiArticle } from "../models/ai-article"
import { AiTask } from "../models/ai-task"
import { SeoKeyword } from "../models/seo-keyword"
import { AiContentScore } from "../models/ai-content-score"
import { AiOptimizationLog } from "../models/ai-optimization-log"
import { AiInternalLinkRule } from "../models/ai-internal-link-rule"
import { AiInternalLinkUsage } from "../models/ai-internal-link-usage"
import { AiAuditLog } from "../models/ai-audit-log"
import { AiUsageEvent } from "../models/ai-usage-event"
import { AiPromptTemplate } from "../models/ai-prompt-template"
import { AiGooglePushLog } from "../models/ai-google-push-log"
import { ApiIntegration } from "../models/api-integration"
import { ContentFactoryConfig } from "../models/content-factory-config"
import { SecretBox } from "./secret-box"
import { AiAdapter } from "./ai-adapter"
import { KeywordCollector } from "./keyword-collector"
import { ContentScorer } from "./content-scorer"
import { InternalLinker } from "./internal-linker"
import { ArticleOptimizer } from "./article-optimizer"
import { ProductLocalizer, ProductSource, LocalizationPayload } from "./product-localizer"
import { GooglePushService } from "./google-push"

const AI_SYSTEM_PROMPT =
  "You are Toonhub's ecommerce SEO editor for anime figures, statues, collectibles and model kits. Write original, useful, search-friendly content. Never invent fake specs. Keep product names accurate."

const PASS_SCORE = 75
const MAX_OPTIMIZE_ATTEMPTS = 2

function articleJsonPrompt(payload: Record<string, unknown>): string {
  const topic = String(payload.topic || "anime figure collecting guide")
  const language = String(payload.locale || "en")
  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords.map(String).join(", ")
    : String(payload.keywords || "")
  const tone = String(payload.tone || "professional, collector-friendly, commercial but not spammy")
  const length = String(payload.length || "900-1300 words")

  return [
    "Create a complete SEO article for Toonhub.",
    "Return ONLY valid JSON with keys: title, slug, locale, summary, seo_title, seo_description, keywords, body.",
    `Requirements:`,
    `- Language: ${language}`,
    `- Topic: ${topic}`,
    `- Target keywords: ${keywords}`,
    `- Tone: ${tone}`,
    `- Target length: ${length}`,
    "- Body should be formatted with clear paragraphs and helpful headings.",
    "- Mention Toonhub naturally where relevant.",
    "- Do not include markdown code fences.",
  ].join("\n")
}

function taskPrompt(task: { task_type: string; payload?: Record<string, unknown> | null }, article?: { title?: string | null; content?: string | null; summary?: string | null } | null): string {
  const payload = task.payload || {}
  switch (task.task_type) {
    case "generate_article":
      return articleJsonPrompt(payload)
    case "keywords":
      return `Generate 20 ecommerce SEO keywords. Return comma-separated keywords only.\nTitle: ${article?.title || ""}\nBody:\n${article?.content || ""}`
    case "optimize_article":
      return `Optimize this article for SEO and conversions. Return improved article body only.\nTitle: ${article?.title || ""}\nBody:\n${article?.content || ""}`
    case "rewrite_title":
      return `Rewrite this title into 5 SEO-friendly title options.\nTitle: ${article?.title || ""}`
    case "rewrite_summary":
      return `Rewrite this summary for SEO, under 160 characters.\nSummary: ${article?.summary || ""}\nArticle:\n${article?.content || ""}`
    case "translate": {
      const target = String(payload.target_locale || "en")
      return `Translate this article to ${target}. Preserve product names and brand names.\nTitle: ${article?.title || ""}\nBody:\n${article?.content || ""}`
    }
    case "polish":
      return `Polish this content for clarity, grammar, and collector appeal. Return improved body only.\n${article?.content || ""}`
    default:
      return String(payload.prompt || "")
  }
}

function parseJsonContent(content: string): Record<string, unknown> {
  const text = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim()
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    return {}
  } catch {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return {}
      }
    }
    return {}
  }
}

/** DML json 字段的 DTO 类型为 Record<string, unknown>,数组/对象统一走此断言 */
function asJson(value: unknown): Record<string, unknown> | null {
  return value == null ? null : (value as unknown as Record<string, unknown>)
}

export class AiSeoModuleService extends MedusaService({
  AiProvider,
  AiArticle,
  AiTask,
  SeoKeyword,
  AiContentScore,
  AiOptimizationLog,
  AiInternalLinkRule,
  AiInternalLinkUsage,
  AiAuditLog,
  AiUsageEvent,
  AiPromptTemplate,
  AiGooglePushLog,
  ApiIntegration,
  ContentFactoryConfig,
}) {
  // ─────────────────────────── 内部工具 ───────────────────────────

  private async getProviderWithKey(id: string | null | undefined) {
    if (!id) throw new Error("No AI provider specified")
    const provider = await this.retrieveAiProvider(id)
    const apiKey = SecretBox.decrypt(provider.encrypted_api_key)
    return {
      ...provider,
      api_key: apiKey,
    }
  }

  private async enabledProviderWithKey() {
    const [providers] = await this.listAndCountAiProviders({ enabled: true }, { take: 1, order: { updated_at: "DESC" } })
    if (!providers.length) throw new Error("No enabled AI provider configured. Open AI SEO Settings and enable a provider.")
    return this.getProviderWithKey(providers[0].id)
  }

  private async audit(action: string, resourceType: string | null, resourceId: string | null, message: string) {
    try {
      await this.createAiAuditLogs({
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        message,
        metadata: { at: new Date().toISOString() },
      })
    } catch {
      // audit 失败不影响主流程
    }
  }

  private async recordUsage(providerId: string | null, taskId: string | null, operation: string, model: string | null, promptChars: number, completionChars: number) {
    try {
      const promptTokens = Math.max(1, Math.round(promptChars / 4))
      const completionTokens = Math.max(1, Math.round(completionChars / 4))
      const estimatedCost = promptTokens / 1_000_000 * 0.15 + completionTokens / 1_000_000 * 0.6
      await this.createAiUsageEvents({
        provider_id: providerId,
        task_id: taskId,
        operation,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
      })
    } catch {
      // 用量记录失败不影响主流程
    }
  }

  private async uniqueSlug(base: string, locale: string, excludeId?: string): Promise<string> {
    const slugBase = (base || "toonhub-article").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "toonhub-article"
    let candidate = slugBase
    let suffix = 2
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.listAiArticles({ slug: candidate, locale }, { take: 1 })
      const clash = existing.some((a) => a.id !== excludeId)
      if (!clash) return candidate
      candidate = `${slugBase}-${suffix}`
      suffix += 1
    }
  }

  private async getArticleOrThrow(id: string) {
    return this.retrieveAiArticle(id)
  }

  // ─────────────────────────── 提供商管理 ───────────────────────────

  async testProvider(id: string): Promise<{ status: string; message: string }> {
    const provider = await this.getProviderWithKey(id)
    try {
      const message = await new AiAdapter(provider).testConnection()
      await this.updateAiProviders({ id: id, 
        last_test_status: "ok",
        last_test_message: String(message).slice(0, 500),
        last_tested_at: new Date(),
      })
      await this.audit("ai_provider_tested", "ai_provider", id, `Provider ${provider.name} test OK`)
      return { status: "ok", message: String(message).slice(0, 200) }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.updateAiProviders({ id: id, 
        last_test_status: "failed",
        last_test_message: message.slice(0, 500),
        last_tested_at: new Date(),
      })
      return { status: "failed", message }
    }
  }

  async fetchProviderModels(id: string): Promise<string[]> {
    const provider = await this.getProviderWithKey(id)
    const models = await new AiAdapter(provider).listModels()
    await this.updateAiProviders({ id: id, models_cache: asJson(models), last_test_status: "ok", last_test_message: `Fetched ${models.length} models`, last_tested_at: new Date() })
    return models
  }

  // ─────────────────────────── 文章 ───────────────────────────

  async createArticle(data: {
    title: string
    slug?: string
    locale?: string
    summary?: string
    content?: string
    seo_title?: string
    seo_description?: string
    seo_keywords?: string
    keywords?: string[]
    status?: string
    source_product_id?: string
  }) {
    const locale = data.locale || "en"
    const article = await this.createAiArticles({
      title: data.title,
      slug: await this.uniqueSlug(data.slug || data.title, locale),
      locale,
      summary: data.summary || null,
      content: data.content || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      seo_keywords: data.seo_keywords || null,
      keywords: asJson(data.keywords),
      status: data.status || "draft",
      source_product_id: data.source_product_id || null,
    })
    await this.audit("article_created", "ai_article", article.id, `Article created: ${article.title}`)
    return article
  }

  async publishArticle(id: string, withPush = true) {
    await this.getArticleOrThrow(id)
    const updated = await this.updateAiArticles({ id: id,  status: "published", published_at: new Date() })
    if (withPush) await this.googlePush(id)
    return updated
  }

  async scheduleArticle(id: string, scheduledAt: string | Date) {
    await this.getArticleOrThrow(id)
    return this.updateAiArticles({ id: id,  status: "scheduled", scheduled_at: new Date(scheduledAt) })
  }

  async bulkPublish(ids: string[]): Promise<number> {
    let count = 0
    for (const id of ids) {
      try {
        await this.publishArticle(id)
        count += 1
      } catch {
        // 单个失败继续
      }
    }
    return count
  }

  async bulkDelete(ids: string[]): Promise<number> {
    let count = 0
    for (const id of ids) {
      try {
        await this.deleteAiArticles(id)
        count += 1
      } catch {
        // 单个失败继续
      }
    }
    return count
  }

  async generateArticleFromAi(providerId: string | null, model: string | null, payload: Record<string, unknown>) {
    const provider = providerId ? await this.getProviderWithKey(providerId) : await this.enabledProviderWithKey()
    const adapter = new AiAdapter(provider)
    const prompt = articleJsonPrompt(payload)
    const locale = String(payload.locale || "en")
    const content = await adapter.chat({ prompt, system: AI_SYSTEM_PROMPT, model: (model || provider.default_model) || undefined, temperature: 0.7 })
    await this.recordUsage(provider.id, null, "generate_article", model || provider.default_model, prompt.length, content.length)

    const parsed = parseJsonContent(content)
    const title = String(parsed.title || payload.topic || "Untitled Article")
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String)
      : String(parsed.keywords || "").split(/[,;\n]/).map((k) => k.trim()).filter(Boolean)

    const existingId = payload.article_id ? String(payload.article_id) : undefined
    if (existingId) {
      return this.updateAiArticles({ id: existingId, 
        title,
        summary: String(parsed.summary || "") || undefined,
        content: String(parsed.body || ""),
        seo_title: String(parsed.seo_title || "") || undefined,
        seo_description: String(parsed.seo_description || "") || undefined,
        seo_keywords: keywords.join(", ") || undefined,
        keywords: asJson(keywords.length ? keywords : null),
      })
    }

    const article = await this.createArticle({
      title,
      slug: String(parsed.slug || title),
      locale,
      summary: String(parsed.summary || ""),
      content: String(parsed.body || ""),
      seo_title: String(parsed.seo_title || ""),
      seo_description: String(parsed.seo_description || ""),
      seo_keywords: keywords.join(", "),
      keywords,
      source_product_id: payload.source_product_id ? String(payload.source_product_id) : undefined,
    })

    if (payload.publish_now === true || payload.publish_now === "true") {
      await this.publishArticle(article.id)
    }
    return article
  }

  // ─────────────────────────── 关键词 ───────────────────────────

  async collectKeywords(providerId: string | null, model: string | null, params: { seed: string; locale?: string; count?: number; source?: string }): Promise<number> {
    const provider = providerId ? await this.getProviderWithKey(providerId) : await this.enabledProviderWithKey()
    const adapter = new AiAdapter(provider)
    const locale = params.locale || "en"
    const count = Math.max(1, Math.min(Number(params.count) || 50, 200))
    const collector = new KeywordCollector(adapter, model || provider.default_model)
    const items = await collector.collect(params.seed, locale, count, params.source || "admin")

    let created = 0
    for (const item of items) {
      const existing = await this.listSeoKeywords({ keyword: item.keyword, locale }, { take: 1 })
      if (existing.length) {
        await this.updateSeoKeywords({ id: existing[0].id,  keyword_type: item.keyword_type, priority: item.priority, source: item.source })
      } else {
        await this.createSeoKeywords({ ...item })
        created += 1
      }
    }
    await this.audit("keywords_collected", "seo_keyword", null, `Collected ${items.length} keywords (${created} new) for seed: ${params.seed}`)
    return created
  }

  // ─────────────────────────── 任务队列 ───────────────────────────

  async createTask(params: {
    task_type: string
    payload?: Record<string, unknown>
    provider_id?: string | null
    model?: string | null
    article_id?: string | null
    scheduled_at?: string | null
  }) {
    return this.createAiTasks({
      task_type: params.task_type,
      status: "queued",
      payload: params.payload || {},
      provider_id: params.provider_id || null,
      model: params.model || null,
      article_id: params.article_id || null,
      scheduled_at: params.scheduled_at ? new Date(params.scheduled_at) : null,
      attempts: 0,
      max_attempts: 3,
    })
  }

  async retryTask(id: string) {
    await this.updateAiTasks({ id: id,  status: "queued", error_message: null })
    return this.retrieveAiTask(id)
  }

  async cancelTask(id: string) {
    return this.updateAiTasks({ id: id,  status: "cancelled", finished_at: new Date() })
  }

  async clearTasks(scope: "completed" | "failed" | "cancelled" | "all"): Promise<number> {
    const statusFilter =
      scope === "all" ? undefined : scope === "completed" ? { status: "completed" } : { status: scope }
    const [, count] = await this.listAndCountAiTasks(statusFilter || {})
    const tasks = await this.listAiTasks(statusFilter || {}, { take: count })
    for (const task of tasks) {
      await this.deleteAiTasks(task.id)
    }
    return tasks.length
  }

  // ─────────────────────────── 任务执行器 ───────────────────────────

  /**
   * 执行单个任务(由定时任务 Worker 调用)。
   * deps.translationService 用于本地化任务的翻译持久化(由调用方从容器解析 translation 模块传入)。
   */
  async runTask(taskId: string, deps?: { translationService?: unknown }) {
    const task = await this.retrieveAiTask(taskId)
    if (task.status === "cancelled") return task

    await this.updateAiTasks({ id: taskId, 
      status: "running",
      started_at: new Date(),
      attempts: (task.attempts || 0) + 1,
    })

    try {
      const payload = (task.payload || {}) as Record<string, unknown>

      switch (task.task_type) {
        case "generate_article": {
          const article = await this.generateArticleFromAi(task.provider_id, task.model, payload)
          await this.updateAiTasks({ id: taskId,  article_id: article.id, result: `Generated article ${article.id}` })
          break
        }
        case "keywords": {
          if (task.article_id) {
            const article = await this.getArticleOrThrow(task.article_id)
            const provider = await this.enabledProviderWithKey()
            const adapter = new AiAdapter(provider)
            const content = await adapter.chat({
              prompt: taskPrompt(task, article),
              system: AI_SYSTEM_PROMPT,
              model: (task.model || provider.default_model) || undefined,
              temperature: 0.6,
            })
            const keywords = content.split(/,|\n/).map((k) => k.trim()).filter(Boolean).slice(0, 30)
            await this.updateAiArticles({ id: article.id, keywords: asJson(keywords), seo_keywords: keywords.join(", ") })
            await this.updateAiTasks({ id: taskId,  result: `Generated ${keywords.length} keywords` })
          }
          break
        }
        case "collect_keywords": {
          const created = await this.collectKeywords(task.provider_id, task.model, {
            seed: String(payload.seed || ""),
            locale: String(payload.locale || "en"),
            count: Number(payload.count) || 50,
            source: String(payload.source || "admin"),
          })
          await this.updateAiTasks({ id: taskId,  result: `Collected ${created} new keywords` })
          break
        }
        case "optimize_article":
        case "rewrite_title":
        case "rewrite_summary":
        case "translate":
        case "polish": {
          if (task.article_id) {
            const article = await this.getArticleOrThrow(task.article_id)
            const provider = task.provider_id
              ? await this.getProviderWithKey(task.provider_id)
              : await this.enabledProviderWithKey()
            const adapter = new AiAdapter(provider)
            const content = await adapter.chat({
              prompt: taskPrompt(task, article),
              system: AI_SYSTEM_PROMPT,
              model: (task.model || provider.default_model) || undefined,
              temperature: 0.6,
            })
            const data: Record<string, unknown> = {}
            if (task.task_type === "optimize_article" || task.task_type === "polish") data.content = content
            if (task.task_type === "rewrite_title") {
              const firstLine = content.split(/\n/).map((l) => l.trim()).filter(Boolean)[0] || ""
              data.title = firstLine.replace(/^\d+[.)]\s*/, "") || article.title
            }
            if (task.task_type === "rewrite_summary") data.summary = content.slice(0, 200)
            if (task.task_type === "translate") {
              data.content = content
              data.locale = String(payload.target_locale || "en")
            }
            await this.updateAiArticles({ id: article.id, ...data })
            await this.updateAiTasks({ id: taskId,  result: `${task.task_type} completed` })
          }
          break
        }
        case "publish": {
          if (task.article_id) {
            await this.publishArticle(task.article_id)
            await this.updateAiTasks({ id: taskId,  result: "Published" })
          }
          break
        }
        case "scheduled_publish": {
          if (task.article_id) {
            const article = await this.getArticleOrThrow(task.article_id)
            const scheduledAt = article.scheduled_at ? new Date(article.scheduled_at).getTime() : 0
            if (scheduledAt > Date.now()) {
              await this.updateAiTasks({ id: taskId, 
                status: "queued",
                scheduled_at: article.scheduled_at,
                result: `Scheduled until ${article.scheduled_at}`,
              })
              return task
            }
            await this.publishArticle(article.id)
            await this.updateAiTasks({ id: taskId,  result: "Scheduled article published" })
          }
          break
        }
        case "bulk_publish": {
          const ids = Array.isArray(payload.article_ids) ? payload.article_ids.map(String) : []
          const count = await this.bulkPublish(ids)
          await this.updateAiTasks({ id: taskId,  result: `Published ${count} articles` })
          break
        }
        case "bulk_delete": {
          const ids = Array.isArray(payload.article_ids) ? payload.article_ids.map(String) : []
          const count = await this.bulkDelete(ids)
          await this.updateAiTasks({ id: taskId,  result: `Deleted ${count} articles` })
          break
        }
        case "automation_pipeline":
          await this.runAutomationPipeline(task)
          break
        case "product_article_generation":
          await this.runProductArticleGeneration(task)
          break
        case "google_push": {
          if (task.article_id) {
            await this.googlePush(task.article_id)
            await this.updateAiTasks({ id: taskId,  result: "Google push log completed" })
          }
          break
        }
        case "product_localization_direct_serial":
        case "product_localization_full_queue":
        case "product_localization_one":
          await this.runProductLocalizationTask(task, deps)
          break
        case "rescore_recent": {
          const count = await this.rescoreRecent(Number(payload.limit) || 50)
          await this.updateAiTasks({ id: taskId,  result: `Rescored ${count} recent articles` })
          break
        }
        case "optimize_low": {
          const count = await this.optimizeLow(Number(payload.limit) || 50)
          await this.updateAiTasks({ id: taskId,  result: `Optimized ${count} low-score articles` })
          break
        }
        case "generate_internal_links": {
          const locale = String(payload.locale || "en")
          let created = 0
          const productSources = (payload.product_sources as Array<{ id: string; title: string; handle?: string }> | undefined) || []
          if (productSources.length) {
            created = await this.generateProductRules(productSources, locale, Number(payload.limit) || 150)
          }
          await this.updateAiTasks({ id: taskId,  result: `Generated ${created} product internal link rules` })
          break
        }
        case "full_pipeline": {
          const locale = String(payload.locale || "en")
          const productSources = (payload.product_sources as Array<{ id: string; title: string; handle?: string }> | undefined) || []
          let rules = 0
          if (productSources.length) rules = await this.generateProductRules(productSources, locale, 500)
          const scored = await this.rescoreRecent(50)
          const optimized = await this.optimizeLow(50)
          await this.updateAiTasks({ id: taskId,  result: `Full pipeline: ${rules} rules, ${scored} scored, ${optimized} optimized` })
          break
        }
        default:
          await this.updateAiTasks({ id: taskId,  result: `Unknown task type ${task.task_type}` })
      }

      const finished = await this.updateAiTasks({ id: taskId,  status: "completed", finished_at: new Date() })
      await this.audit("task_completed", "ai_task", taskId, `Task ${task.task_type} completed`)
      return finished
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const attempts = (task.attempts || 0) + 1
      if (attempts < (task.max_attempts || 3)) {
        await this.updateAiTasks({ id: taskId,  status: "retrying", error_message: message })
      } else {
        await this.updateAiTasks({ id: taskId,  status: "failed", error_message: message, finished_at: new Date() })
        await this.audit("task_failed", "ai_task", taskId, message)
      }
      return this.retrieveAiTask(taskId)
    }
  }

  private async runAutomationPipeline(task: { id: string; task_type: string; payload?: Record<string, unknown> | null; provider_id: string | null; model: string | null }): Promise<void> {
    const payload = (task.payload || {}) as Record<string, unknown>
    const seed = String(payload.seed || "anime figure collecting guide")
    const locale = String(payload.locale || "en")
    const publishMode = String(payload.publish_mode || "draft")

    let created = 0
    try {
      created = await this.collectKeywords(task.provider_id, task.model, {
        seed,
        locale,
        count: Number(payload.keyword_count) || 30,
        source: "automation_pipeline",
      })
    } catch {
      // 关键词收集失败不阻断文章生成
    }

    const productFocus = payload.product_focus !== false
    const articlesPerRound = Math.max(1, Number(payload.articles_per_round) || 2)
    let generated = 0

    const sources = (payload.product_sources as Array<{ product_id: string; title: string; description?: string; handle?: string }> | undefined) || []
    const productsForArticles = productFocus && sources.length
      ? sources.slice(0, articlesPerRound)
      : []

    for (const source of productsForArticles) {
      try {
        await this.generateArticleFromAi(task.provider_id, task.model, {
          topic: source.title,
          locale,
          publish_now: publishMode === "published",
          source_product_id: source.product_id,
          keywords: [source.title],
        })
        generated += 1
      } catch {
        // 单个产品失败继续
      }
    }

    await this.updateAiTasks({ id: task.id,  result: `Automation round done: ${created} keywords, ${generated} articles` })
  }

  private async runProductArticleGeneration(task: { id: string; task_type: string; payload?: Record<string, unknown> | null; provider_id: string | null; model: string | null }): Promise<void> {
    const payload = (task.payload || {}) as Record<string, unknown>
    const locale = String(payload.locale || "en")
    const publishMode = String(payload.publish_mode || "draft")
    const limit = Math.max(1, Math.min(Number(payload.limit) || 10, 50))

    const sources = (payload.product_sources as Array<{ product_id: string; title: string; description?: string; handle?: string }> | undefined) || []
    let generated = 0
    for (const source of sources.slice(0, limit)) {
      try {
        await this.generateArticleFromAi(task.provider_id, task.model, {
          topic: source.title,
          locale,
          publish_now: publishMode === "published",
          source_product_id: source.product_id,
          keywords: [source.title],
        })
        generated += 1
      } catch {
        // 单个产品失败继续
      }
    }
    await this.updateAiTasks({ id: task.id,  result: `Generated ${generated} product articles` })
  }

  private async runProductLocalizationTask(task: { id: string; task_type: string; payload?: Record<string, unknown> | null; provider_id: string | null; model: string | null }, deps?: { translationService?: unknown }): Promise<void> {
    const payload = (task.payload || {}) as Record<string, unknown>
    const locale = String(payload.locale || (Array.isArray(payload.locales) ? payload.locales[0] : "de") || "de")
    const force = payload.force === true
    const sources = (payload.product_sources as ProductSource[] | undefined) || []
    let applied = 0
    let failed = 0

    for (const source of sources) {
      try {
        const provider = task.provider_id
          ? await this.getProviderWithKey(task.provider_id)
          : await this.enabledProviderWithKey()
        const localizer = new ProductLocalizer(new AiAdapter(provider), task.model || provider.default_model, force)
        const result = await localizer.localizeProduct(source, locale)
        if (result.status === "preview_ready" && result.translation) {
          await this.persistLocalization(result.translation, deps)
          applied += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }
    await this.updateAiTasks({ id: task.id,  result: `Localized ${applied} products (${failed} failed) to ${locale}` })
  }

  // ─────────────────────────── 内容评分 ───────────────────────────

  async scoreArticle(articleId: string) {
    const article = await this.getArticleOrThrow(articleId)
    const result = ContentScorer.scoreArticle({
      title: article.title,
      summary: article.summary,
      content: article.content,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      seo_keywords: article.seo_keywords,
    })

    const existing = await this.listAiContentScores({ article_id: articleId }, { take: 1 })
    const scoreData = {
      seo_score: result.seo_score,
      readability_score: result.readability_score,
      keyword_score: result.keyword_score,
      originality_score: result.originality_score,
      product_relevance_score: result.product_relevance_score,
      ai_risk_score: result.ai_risk_score,
      overall_score: result.overall_score,
      status: result.status,
      notes: result.notes,
      checks: result.checks,
      metadata: { scored_at: new Date().toISOString() },
    }
    const score = existing.length
      ? await this.updateAiContentScores({ id: existing[0].id, ...scoreData })
      : await this.createAiContentScores({ article_id: articleId, ...scoreData })

    await this.updateAiArticles({ id: articleId, 
      seo_score: result.overall_score,
      quality_status: result.status,
    })
    return score
  }

  async rescoreRecent(limit = 50): Promise<number> {
    const articles = await this.listAiArticles({}, { take: Math.min(Math.max(limit, 1), 200), order: { updated_at: "DESC" } })
    let count = 0
    for (const article of articles) {
      if (!(article.content || "").trim()) continue
      await this.scoreArticle(article.id)
      count += 1
    }
    return count
  }

  async optimizeArticle(articleId: string): Promise<{ optimized: boolean; score: number | null }> {
    const article = await this.getArticleOrThrow(articleId)
    const score = await this.scoreArticle(articleId)

    const editor = {
      getArticle: async (id: string) => {
        const a = await this.getArticleOrThrow(id)
        return {
          id: a.id,
          title: a.title,
          summary: a.summary,
          content: a.content,
          seo_title: a.seo_title,
          seo_description: a.seo_description,
          seo_keywords: a.seo_keywords,
          locale: a.locale,
          optimization_attempts: a.optimization_attempts,
        }
      },
      updateArticle: async (id: string, data: Record<string, unknown>) => {
        await this.updateAiArticles({ id: id, ...data })
      },
      listRules: async (locale: string) => {
        const [rules] = await this.listAndCountAiInternalLinkRules(
          { enabled: true, locale: [locale, "all", "", null] as never },
          { take: 500, order: { priority: "DESC" } }
        )
        return rules.map((r) => ({
          id: r.id,
          anchor_text: r.anchor_text,
          target_url: r.target_url,
          max_insertions: r.max_insertions,
        }))
      },
      recordRuleUsage: async (usage: Record<string, number>, articleId2: string, locale2: string) => {
        for (const [ruleId, count] of Object.entries(usage)) {
          try {
            const rule = await this.retrieveAiInternalLinkRule(ruleId)
            await this.updateAiInternalLinkRules({ id: ruleId,  usage_count: (rule.usage_count || 0) + count })
            await this.createAiInternalLinkUsages({
              rule_id: ruleId,
              article_id: articleId2,
              anchor_text: rule.anchor_text,
              target_url: rule.target_url,
              locale: locale2,
              insertions_count: count,
            })
          } catch {
            // 忽略单条失败
          }
        }
      },
    }

    const optimized = await ArticleOptimizer.optimizeIfNeeded(editor, articleId, score ? { ...score } : null)
    const afterScore = optimized ? await this.scoreArticle(articleId) : score

    if (optimized) {
      await this.createAiOptimizationLogs({
        article_id: articleId,
        content_score_id: afterScore?.id || null,
        status: (afterScore?.overall_score || 0) >= PASS_SCORE ? "completed" : "needs_review",
        before_score: score?.overall_score || 0,
        after_score: afterScore?.overall_score || 0,
        attempt: article.optimization_attempts || 0,
        notes: `Optimization ${(afterScore?.overall_score || 0) >= PASS_SCORE ? "passed" : "below pass score"}`,
      })
    }

    return { optimized, score: afterScore?.overall_score ?? null }
  }

  async optimizeLow(limit = 50): Promise<number> {
    const [scores] = await this.listAndCountAiContentScores(
      { status: ["weak", "needs_review"] as never },
      { take: Math.min(Math.max(limit, 1), 100), order: { updated_at: "DESC" } }
    )
    let count = 0
    for (const score of scores) {
      if (!score.article_id) continue
      const result = await this.optimizeArticle(score.article_id)
      if (result.optimized) count += 1
    }
    return count
  }

  // ─────────────────────────── 内部链接 ───────────────────────────

  async generateProductRules(
    products: Array<{ id: string; title: string; handle?: string }>,
    locale = "en",
    limit = 150
  ): Promise<number> {
    let created = 0
    const list = products.slice(0, Math.min(Math.max(limit, 1), 500))
    for (const product of list) {
      const name = (product.title || "").trim()
      if (!name) continue
      const target = `/us/${locale}/products/${product.handle || product.id}`
      const anchors = this.anchorsForName(name)
      for (const [index, anchor] of anchors.entries()) {
        if (await this.upsertRule({
          anchor_text: anchor,
          target_url: target,
          target_type: "product",
          target_id: product.id,
          source_type: "product",
          locale,
          priority: 70 - index,
          max_insertions: 1,
          enabled: true,
          auto_generated: true,
          notes: `Auto-generated from product: ${name}`,
        })) created += 1
      }
    }
    return created
  }

  async generateArticleRules(locale = "en"): Promise<number> {
    const [articles] = await this.listAndCountAiArticles(
      { status: "published" },
      { take: 500, order: { created_at: "DESC" } }
    )
    let created = 0
    for (const article of articles) {
      const title = (article.title || "").trim()
      const slug = (article.slug || "").trim()
      if (!title || !slug) continue
      const target = `/us/${locale}/articles/${slug}`
      const anchors = [title, ...String(article.seo_keywords || "").split(/[,;\n]/).map((k) => k.trim())]
        .filter(Boolean)
        .slice(0, 5)
      for (const [index, anchor] of anchors.entries()) {
        if (await this.upsertRule({
          anchor_text: anchor,
          target_url: target,
          target_type: "article",
          target_id: article.id,
          source_type: "article",
          locale,
          priority: 60 - index,
          max_insertions: 1,
          enabled: true,
          auto_generated: true,
          notes: `Auto-generated from article: ${title}`,
        })) created += 1
      }
    }
    return created
  }

  async applyInternalLinks(articleId: string): Promise<{ inserted: number }> {
    const article = await this.getArticleOrThrow(articleId)
    const content = (article.content || "").toString()
    if (!content.trim()) return { inserted: 0 }

    const locale = article.locale || "en"
    const [rules] = await this.listAndCountAiInternalLinkRules(
      { enabled: true, locale: [locale, "all", "", null] as never },
      { take: 500, order: { priority: "DESC", usage_count: "ASC" } }
    )
    const result = InternalLinker.apply(
      content,
      rules.map((r) => ({ id: r.id, anchor_text: r.anchor_text, target_url: r.target_url, max_insertions: r.max_insertions })),
      8
    )

    if (result.inserted_count > 0) {
      await this.updateAiArticles({ id: articleId,  content: result.content })
      for (const [ruleId, count] of Object.entries(result.rule_usage)) {
        try {
          const rule = await this.retrieveAiInternalLinkRule(ruleId)
          await this.updateAiInternalLinkRules({ id: ruleId, 
            usage_count: (rule.usage_count || 0) + count,
            last_used_at: new Date(),
          })
          await this.createAiInternalLinkUsages({
            rule_id: ruleId,
            article_id: articleId,
            anchor_text: rule.anchor_text,
            target_url: rule.target_url,
            locale,
            insertions_count: count,
            metadata: { article_title: article.title, article_slug: article.slug },
          })
        } catch {
          // 忽略单条失败
        }
      }
    }
    return { inserted: result.inserted_count }
  }

  private async upsertRule(attrs: {
    anchor_text: string
    target_url: string
    target_type?: string
    target_id?: string | null
    source_type: string
    locale: string
    priority: number
    max_insertions: number
    enabled: boolean
    auto_generated: boolean
    notes?: string
  }): Promise<boolean> {
    if (!attrs.anchor_text || !attrs.target_url) return false
    const existing = await this.listAiInternalLinkRules(
      { anchor_text: attrs.anchor_text, target_url: attrs.target_url, locale: attrs.locale },
      { take: 1 }
    )
    if (existing.length) {
      await this.updateAiInternalLinkRules({ id: existing[0].id, 
        target_type: attrs.target_type || null,
        target_id: attrs.target_id || null,
        source_type: attrs.source_type,
        priority: attrs.priority,
        max_insertions: attrs.max_insertions,
        enabled: attrs.enabled,
        auto_generated: attrs.auto_generated,
        notes: attrs.notes || null,
      })
      return false
    }
    await this.createAiInternalLinkRules({
      anchor_text: attrs.anchor_text,
      target_url: attrs.target_url,
      target_type: attrs.target_type || null,
      target_id: attrs.target_id || null,
      source_type: attrs.source_type,
      locale: attrs.locale,
      priority: attrs.priority,
      max_insertions: attrs.max_insertions,
      enabled: attrs.enabled,
      auto_generated: attrs.auto_generated,
      notes: attrs.notes || null,
    })
    return true
  }

  private anchorsForName(name: string): string[] {
    const clean = name.replace(/\s+/g, " ").trim()
    const parts = clean.split(/\s+/)
    const candidates = [clean, `${clean} figure`, `${clean} statue`, `${clean} anime figure`]
    if (parts.length >= 2) {
      const firstTwo = parts.slice(0, 2).join(" ")
      candidates.push(firstTwo, `${firstTwo} figure`)
    }
    if (parts.length >= 3) candidates.push(parts.slice(0, 3).join(" "))
    return [...new Set(candidates.map((c) => c.trim()).filter(Boolean))].slice(0, 5)
  }

  // ─────────────────────────── 产品本地化 ───────────────────────────

  async localizationPreview(
    sources: ProductSource[],
    locales: string[],
    force = false,
    providerId?: string | null,
    model?: string | null
  ): Promise<Array<{ status: string; product_id: string; locale: string; translation?: LocalizationPayload; error?: string }>> {
    const provider = providerId ? await this.getProviderWithKey(providerId) : await this.enabledProviderWithKey()
    const localizer = new ProductLocalizer(new AiAdapter(provider), model || provider.default_model, force)
    const items: Array<{ status: string; product_id: string; locale: string; translation?: LocalizationPayload; error?: string }> = []
    for (const source of sources) {
      for (const locale of locales) {
        const result = await localizer.localizeProduct(source, locale)
        items.push(result)
      }
    }
    return items
  }

  async persistLocalization(translation: LocalizationPayload, deps?: { translationService?: unknown }): Promise<boolean> {
    const translationService = deps?.translationService as
      | {
          listTranslations: (filters?: Record<string, unknown>, config?: { take?: number }) => Promise<Array<{ id: string }>>
          createTranslations: (data: Record<string, unknown>) => Promise<unknown>
          updateTranslations: (data: Record<string, unknown>) => Promise<unknown>
        }
      | undefined
    if (!translationService) return false

    const data = {
      reference: "product",
      reference_id: translation.product_id,
      locale_code: translation.locale,
      translations: {
        title: translation.title,
        description: translation.description,
        subtitle: translation.subtitle || undefined,
        material: translation.material || undefined,
        meta_title: translation.meta_title || undefined,
        meta_description: translation.meta_description || undefined,
        meta_keywords: translation.meta_keywords || undefined,
      },
    }

    const existing = await translationService.listTranslations(
      { reference: "product", reference_id: translation.product_id, locale_code: translation.locale },
      { take: 1 }
    )
    if (existing.length) {
      await translationService.updateTranslations({ id: existing[0].id, ...data })
    } else {
      await translationService.createTranslations(data)
    }
    await this.audit("product_translation_applied", "product", translation.product_id, `locale=${translation.locale}`)
    return true
  }

  // ─────────────────────────── Google Push ───────────────────────────

  async googlePush(articleId: string) {
    const article = await this.getArticleOrThrow(articleId)
    const push = new GooglePushService()
    const url = push.articleUrl(article.locale || "en", article.slug)
    try {
      return await this.createAiGooglePushLogs({
        article_id: articleId,
        url,
        push_type: "article_published",
        status: "completed",
        message: "Article URL recorded for Google discovery. Ensure sitemap and robots.txt expose this URL.",
        metadata: { sitemap_url: push.sitemapUrl() },
      })
    } catch {
      return null
    }
  }

  // ─────────────────────────── 统计 ───────────────────────────

  async stats(): Promise<Record<string, number>> {
    const [, articles] = await this.listAndCountAiArticles({})
    const [, published] = await this.listAndCountAiArticles({ status: "published" })
    const [, tasks] = await this.listAndCountAiTasks({})
    const [, failedTasks] = await this.listAndCountAiTasks({ status: "failed" })
    const [, keywords] = await this.listAndCountSeoKeywords({})
    const [, scores] = await this.listAndCountAiContentScores({})
    const [, logs] = await this.listAndCountAiAuditLogs({})
    const [, providers] = await this.listAndCountAiProviders({})
    const [, rules] = await this.listAndCountAiInternalLinkRules({})
    const [, usageEvents] = await this.listAndCountAiUsageEvents({})

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const events = await this.listAiUsageEvents({}, { take: usageEvents })
    const todayEvents = events.filter((e) => {
      const createdAt = (e as unknown as { createdAt?: string | null }).createdAt
      return createdAt && new Date(createdAt) >= today
    })
    const todayCost = todayEvents.reduce((sum, e) => sum + (e.estimated_cost || 0), 0)

    return {
      articles,
      published,
      tasks,
      failed_tasks: failedTasks,
      keywords,
      scores,
      logs,
      providers,
      internal_link_rules: rules,
      usage_events: usageEvents,
      today_cost: Math.round(todayCost * 100) / 100,
    }
  }
}
