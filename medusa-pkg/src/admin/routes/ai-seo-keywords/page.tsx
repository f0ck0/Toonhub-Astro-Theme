import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Select, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type Keyword = {
  id: string
  keyword: string
  keyword_type: string
  locale: string
  priority: number
  status: string
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

const STATUS_COLORS: Record<string, "green" | "grey" | "orange" | "blue"> = {
  selected: "green",
  new: "blue",
  used: "grey",
  ignored: "grey",
  published: "green",
}

const KeywordsPage = () => {
  const queryClient = useQueryClient()
  const [seed, setSeed] = useState("")
  const [locale, setLocale] = useState("en")
  const [count, setCount] = useState("50")

  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-keywords"],
    queryFn: () => Api.get("/admin/ai-seo/keywords"),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-keywords"] })

  const collect = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/keywords/collect", { seed, locale, count: Number(count) }),
    onSuccess: () => { invalidate() },
  })

  const setStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) =>
      Api.post("/admin/ai-seo/keywords/status", { keyword_ids: ids, status }),
    onSuccess: invalidate,
  })

  const clearAll = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/keywords/clear"),
    onSuccess: invalidate,
  })

  const keywords: Keyword[] = data?.keywords || []

  return (
    <Container className="p-6">
      <Heading level="h1">关键词中心</Heading>
      <Text className="text-ui-fg-subtle">AI 批量收集与管理 SEO 关键词</Text>

      <div className="flex gap-x-2 mt-4 items-end">
        <div className="flex-1">
          <Text className="text-sm mb-1">种子主题</Text>
          <Input placeholder="例如: anime figure collecting" value={seed} onChange={(e) => setSeed(e.target.value)} />
        </div>
        <div>
          <Text className="text-sm mb-1">语言</Text>
          <Select value={locale} onValueChange={setLocale}>
            <Select.Trigger />
            <Select.Content>
              {["en", "zh-CN", "zh-TW", "de", "fr", "es", "it", "pl", "ja"].map((l) => (
                <Select.Item key={l} value={l}>{l}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div>
          <Text className="text-sm mb-1">数量</Text>
          <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="w-20" />
        </div>
        <Button isLoading={collect.isPending} onClick={() => collect.mutate()}>AI 收集</Button>
        <Button variant="danger" onClick={() => clearAll.mutate()}>清空</Button>
      </div>

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>关键词</Table.HeaderCell>
              <Table.HeaderCell>类型</Table.HeaderCell>
              <Table.HeaderCell>语言</Table.HeaderCell>
              <Table.HeaderCell>优先级</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell>操作</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {keywords.map((keyword) => (
              <Table.Row key={keyword.id}>
                <Table.Cell>{keyword.keyword}</Table.Cell>
                <Table.Cell>{keyword.keyword_type}</Table.Cell>
                <Table.Cell>{keyword.locale}</Table.Cell>
                <Table.Cell>{keyword.priority}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLORS[keyword.status] || "grey"}>{keyword.status}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={keyword.status === "selected"}
                    onClick={() => setStatus.mutate({ ids: [keyword.id], status: "selected" })}
                  >
                    选用
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
            {!keywords.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无关键词,输入种子主题并点击 AI 收集</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 关键词",
  icon: MagnifyingGlass,
})

export default KeywordsPage
