import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Textarea, Select, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type Article = {
  id: string
  title: string
  slug: string
  locale: string
  status: string
  summary: string | null
  seo_score: number | null
  quality_status: string | null
  published_at: string | null
  updated_at: string | null
}

const STATUS_COLORS: Record<string, "green" | "grey" | "orange" | "red" | "blue"> = {
  published: "green",
  draft: "grey",
  scheduled: "orange",
  archived: "grey",
  failed: "red",
}

const Api = {
  get: async (path: string) => (await fetch(path)).json(),
  post: async (path: string, body?: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.json()
  },
}

const GenerateForm = ({ onDone }: { onDone: () => void }) => {
  const [topic, setTopic] = useState("")
  const [locale, setLocale] = useState("en")
  const [keywords, setKeywords] = useState("")
  const [length, setLength] = useState("900-1300 words")

  const mutation = useMutation({
    mutationFn: async () => {
      await Api.post("/admin/ai-seo/articles/generate", {
        topic,
        locale,
        length,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      })
    },
    onSuccess: onDone,
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 border rounded-lg">
      <Heading level="h3">AI 生成文章</Heading>
      <Input placeholder="主题 / Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <div className="flex gap-x-2">
        <Input placeholder="关键词(逗号分隔)" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="flex-1" />
        <Select value={locale} onValueChange={setLocale}>
          <Select.Trigger />
          <Select.Content>
            {["en", "zh-CN", "zh-TW", "de", "fr", "es", "it", "pl", "ja"].map((l) => (
              <Select.Item key={l} value={l}>{l}</Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
      <Input placeholder="长度,如 900-1300 words" value={length} onChange={(e) => setLength(e.target.value)} />
      <Button isLoading={mutation.isPending} onClick={() => mutation.mutate()}>提交生成(异步任务)</Button>
    </div>
  )
}

const ArticlesPage = () => {
  const queryClient = useQueryClient()
  const [showGenerate, setShowGenerate] = useState(
    typeof window !== "undefined" && window.location.search.includes("action=generate")
  )
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-articles", statusFilter],
    queryFn: () => Api.get(`/admin/ai-seo/articles${statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-articles"] })

  const publish = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/articles/${id}/publish`),
    onSuccess: invalidate,
  })
  const score = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/articles/${id}/score`),
    onSuccess: invalidate,
  })
  const queueKeywords = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/articles/${id}/queue-ai`, { task_type: "keywords" }),
    onSuccess: invalidate,
  })

  const articles: Article[] = data?.articles || []

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">文章中心</Heading>
          <Text className="text-ui-fg-subtle">AI 写作、评分、优化与发布</Text>
        </div>
        <Button variant="secondary" onClick={() => setShowGenerate((v) => !v)}>
          {showGenerate ? "收起生成表单" : "AI 生成文章"}
        </Button>
      </div>

      {showGenerate && (
        <div className="mt-4">
          <GenerateForm onDone={() => { invalidate(); setShowGenerate(false) }} />
        </div>
      )}

      <div className="mt-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="all">全部</Select.Item>
            {["draft", "scheduled", "published", "archived", "failed"].map((s) => (
              <Select.Item key={s} value={s}>{s}</Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      {isLoading ? (
        <Text>加载中...</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>标题</Table.HeaderCell>
              <Table.HeaderCell>语言</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell>SEO 分</Table.HeaderCell>
              <Table.HeaderCell>操作</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {articles.map((article) => (
              <Table.Row key={article.id}>
                <Table.Cell>
                  <Text className="font-medium">{article.title}</Text>
                  <Text className="text-ui-fg-subtle text-xs">/{article.slug}</Text>
                </Table.Cell>
                <Table.Cell>{article.locale}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLORS[article.status] || "grey"}>{article.status}</Badge>
                  {article.quality_status && article.quality_status !== "passed" && (
                    <Badge color="orange" className="ml-1">{article.quality_status}</Badge>
                  )}
                </Table.Cell>
                <Table.Cell>{article.seo_score ?? "—"}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-x-1">
                    <Button size="small" variant="secondary" disabled={article.status === "published"} onClick={() => publish.mutate(article.id)}>
                      发布
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => score.mutate(article.id)}>评分</Button>
                    <Button size="small" variant="secondary" onClick={() => queueKeywords.mutate(article.id)}>关键词</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!articles.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无文章</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 文章",
  icon: DocumentText,
})

export default ArticlesPage
