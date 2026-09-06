import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Link } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type Rule = {
  id: string
  anchor_text: string
  target_url: string
  locale: string
  priority: number
  usage_count: number
  enabled: boolean
  auto_generated: boolean
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

const InternalLinksPage = () => {
  const queryClient = useQueryClient()
  const [anchorText, setAnchorText] = useState("")
  const [targetUrl, setTargetUrl] = useState("")
  const [locale, setLocale] = useState("en")

  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-internal-links"],
    queryFn: () => Api.get("/admin/ai-seo/internal-links"),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-internal-links"] })

  const create = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/internal-links", { anchor_text: anchorText, target_url: targetUrl, locale }),
    onSuccess: () => {
      invalidate()
      setAnchorText("")
      setTargetUrl("")
    },
  })

  const generateProducts = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/internal-links/generate-products", { locale, limit: 150 }),
    onSuccess: invalidate,
  })
  const generateArticles = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/internal-links/generate-articles", { locale }),
    onSuccess: invalidate,
  })

  const rules: Rule[] = data?.rules || []

  return (
    <Container className="p-6">
      <Heading level="h1">内部链接</Heading>
      <Text className="text-ui-fg-subtle">锚文本规则自动注入文章正文(保护 HTML 标签,每篇最多 8 条)</Text>

      <div className="flex gap-x-2 mt-4 items-end">
        <div className="flex-1">
          <Text className="text-sm mb-1">锚文本</Text>
          <Input placeholder="例如: anime figure" value={anchorText} onChange={(e) => setAnchorText(e.target.value)} />
        </div>
        <div className="flex-1">
          <Text className="text-sm mb-1">目标 URL</Text>
          <Input placeholder="例如: /us/en/products/xxx" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
        </div>
        <div>
          <Text className="text-sm mb-1">语言</Text>
          <Input value={locale} onChange={(e) => setLocale(e.target.value)} className="w-24" />
        </div>
        <Button isLoading={create.isPending} onClick={() => create.mutate()}>添加规则</Button>
      </div>

      <div className="flex gap-x-2 mt-3">
        <Button variant="secondary" isLoading={generateProducts.isPending} onClick={() => generateProducts.mutate()}>
          从产品生成规则
        </Button>
        <Button variant="secondary" isLoading={generateArticles.isPending} onClick={() => generateArticles.mutate()}>
          从文章生成规则
        </Button>
      </div>

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>锚文本</Table.HeaderCell>
              <Table.HeaderCell>目标 URL</Table.HeaderCell>
              <Table.HeaderCell>语言</Table.HeaderCell>
              <Table.HeaderCell>优先级</Table.HeaderCell>
              <Table.HeaderCell>使用次数</Table.HeaderCell>
              <Table.HeaderCell>来源</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rules.map((rule) => (
              <Table.Row key={rule.id}>
                <Table.Cell>{rule.anchor_text}</Table.Cell>
                <Table.Cell><Text className="text-xs">{rule.target_url}</Text></Table.Cell>
                <Table.Cell>{rule.locale}</Table.Cell>
                <Table.Cell>{rule.priority}</Table.Cell>
                <Table.Cell>{rule.usage_count}</Table.Cell>
                <Table.Cell>
                  {rule.auto_generated ? <Badge color="blue">自动</Badge> : <Badge color="grey">手动</Badge>}
                  {!rule.enabled && <Badge color="red" className="ml-1">禁用</Badge>}
                </Table.Cell>
              </Table.Row>
            ))}
            {!rules.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无规则</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 内链",
  icon: Link,
})

export default InternalLinksPage
