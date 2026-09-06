import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Cash } from "@medusajs/icons"
import { Container, Heading, Text, Button, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

type UsageEvent = {
  id: string
  operation: string
  model: string | null
  total_tokens: number
  estimated_cost: number
  created_at: string | null
}

const Api = {
  get: async (path: string) => (await fetch(path)).json(),
  post: async (path: string) => {
    const res = await fetch(path, { method: "POST" })
    return res.json()
  },
}

const CostsPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-costs"],
    queryFn: () => Api.get("/admin/ai-seo/costs"),
  })

  const clear = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/costs/clear"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-seo-costs"] }),
  })

  const events: UsageEvent[] = data?.events || []

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">成本监控</Heading>
          <Text className="text-ui-fg-subtle">AI 调用 Token 与预估费用</Text>
        </div>
        <Button variant="danger" onClick={() => clear.mutate()}>清空记录</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
        <div className="p-4 border rounded-lg">
          <Text className="text-ui-fg-subtle text-sm">今日 Token</Text>
          <Heading level="h2" className="mt-1">{data?.today_tokens ?? 0}</Heading>
        </div>
        <div className="p-4 border rounded-lg">
          <Text className="text-ui-fg-subtle text-sm">今日费用 ($)</Text>
          <Heading level="h2" className="mt-1">{data?.today_cost ?? 0}</Heading>
        </div>
        <div className="p-4 border rounded-lg">
          <Text className="text-ui-fg-subtle text-sm">调用次数</Text>
          <Heading level="h2" className="mt-1">{data?.count ?? 0}</Heading>
        </div>
      </div>

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>操作</Table.HeaderCell>
              <Table.HeaderCell>模型</Table.HeaderCell>
              <Table.HeaderCell>Token</Table.HeaderCell>
              <Table.HeaderCell>费用 ($)</Table.HeaderCell>
              <Table.HeaderCell>时间</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {events.map((event) => (
              <Table.Row key={event.id}>
                <Table.Cell>{event.operation}</Table.Cell>
                <Table.Cell>{event.model || "—"}</Table.Cell>
                <Table.Cell>{event.total_tokens}</Table.Cell>
                <Table.Cell>{event.estimated_cost}</Table.Cell>
                <Table.Cell>{event.created_at ? new Date(event.created_at).toLocaleString() : "—"}</Table.Cell>
              </Table.Row>
            ))}
            {!events.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无用量记录</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 成本",
  icon: Cash,
})

export default CostsPage
