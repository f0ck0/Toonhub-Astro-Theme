import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Bolt } from "@medusajs/icons"
import { Container, Heading, Text, Button, Select } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

const Api = {
  post: async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  },
}

const AsyncPipelinePage = () => {
  const queryClient = useQueryClient()
  const [locale, setLocale] = useState("en")

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-tasks"] })

  const run = useMutation({
    mutationFn: async (action: string) =>
      Api.post("/admin/ai-seo/async", { action, locale, limit: 50, product_rules_minimum: 150 }),
    onSuccess: invalidate,
  })

  const actions = [
    { key: "full", label: "完整管道", desc: "生成产品内链规则 → 重评最近文章 → 优化低分文章" },
    { key: "score_recent", label: "重评最近文章", desc: "对最近 50 篇文章重新六维评分" },
    { key: "optimize_low", label: "优化低分文章", desc: "对 weak/needs_review 文章自动补结构并优化" },
    { key: "internal_links", label: "生成内链规则", desc: "从产品批量生成锚文本规则(最多 150 条/批)" },
  ]

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">异步 AI SEO 管道</Heading>
          <Text className="text-ui-fg-subtle">评分、优化与内链生成全部通过任务队列异步执行,不阻塞请求</Text>
        </div>
        <Select value={locale} onValueChange={setLocale}>
          <Select.Trigger />
          <Select.Content>
            {["en", "zh-CN", "zh-TW", "de", "fr", "es", "it", "pl", "ja"].map((l) => (
              <Select.Item key={l} value={l}>{l}</Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-2">
        {actions.map((action) => (
          <div key={action.key} className="p-4 border rounded-lg">
            <Heading level="h3">{action.label}</Heading>
            <Text className="text-ui-fg-subtle text-sm mt-1">{action.desc}</Text>
            <Button
              className="mt-3"
              variant="secondary"
              isLoading={run.isPending && run.variables === action.key}
              onClick={() => run.mutate(action.key)}
            >
              运行(异步任务)
            </Button>
          </div>
        ))}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 异步管道",
  icon: Bolt,
})

export default AsyncPipelinePage
