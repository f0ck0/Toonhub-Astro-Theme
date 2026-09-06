import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles } from "@medusajs/icons"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"

/**
 * AI SEO 工作台首页:统计卡片 + 功能入口
 */
const AiSeoDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-stats"],
    queryFn: async () => {
      const res = await fetch("/admin/ai-seo")
      return res.json()
    },
  })

  const stats = (data?.stats || {}) as Record<string, number>

  const cards = [
    { label: "文章", value: stats.articles ?? 0 },
    { label: "已发布", value: stats.published ?? 0 },
    { label: "任务", value: stats.tasks ?? 0 },
    { label: "失败任务", value: stats.failed_tasks ?? 0 },
    { label: "关键词", value: stats.keywords ?? 0 },
    { label: "评分", value: stats.scores ?? 0 },
    { label: "内链规则", value: stats.internal_link_rules ?? 0 },
    { label: "今日费用 ($)", value: stats.today_cost ?? 0 },
  ]

  const links = [
    { href: "/app/ai-seo-articles", label: "文章中心", desc: "AI 写作、发布、批量操作" },
    { href: "/app/ai-seo-keywords", label: "关键词中心", desc: "AI 收集与管理关键词" },
    { href: "/app/ai-seo-tasks", label: "任务队列", desc: "重试、取消、清空" },
    { href: "/app/ai-seo-settings", label: "AI 设置", desc: "提供商、API Key、模型" },
    { href: "/app/ai-seo-scores", label: "内容评分", desc: "SEO 质量与 AI 风险" },
    { href: "/app/ai-seo-internal-links", label: "内部链接", desc: "锚文本规则" },
    { href: "/app/ai-seo-localization", label: "产品本地化", desc: "多语言翻译" },
    { href: "/app/ai-seo-async", label: "异步管道", desc: "评分/优化/内链流水线" },
    { href: "/app/ai-seo-costs", label: "成本监控", desc: "Token 与费用" },
    { href: "/app/ai-seo-logs", label: "审计日志", desc: "操作与错误" },
  ]

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">AI SEO 工作台</Heading>
          <Text className="text-ui-fg-subtle">从 Spree 后端移植的 AI 内容与 SEO 引擎</Text>
        </div>
        <Button onClick={() => { window.location.href = "/app/ai-seo-articles?action=generate" }}>
          生成文章
        </Button>
      </div>

      {isLoading ? (
        <Text>加载中...</Text>
      ) : (
        <div className="grid grid-cols-2 gap-4 mt-6 md:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="p-4 border rounded-lg">
              <Text className="text-ui-fg-subtle text-sm">{card.label}</Text>
              <Heading level="h2" className="mt-1">{card.value}</Heading>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="no-underline">
            <div className="p-4 border rounded-lg hover:bg-ui-bg-subtle">
              <Heading level="h3">{link.label}</Heading>
              <Text className="text-ui-fg-subtle text-sm mt-1">{link.desc}</Text>
            </div>
          </a>
        ))}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO",
  icon: Sparkles,
})

export default AiSeoDashboard
