import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Folder } from "@medusajs/icons"
import { Container, Heading, Text, Button, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

type AuditLog = {
  id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  message: string | null
  created_at: string | null
}

const Api = {
  get: async (path: string) => (await fetch(path)).json(),
  post: async (path: string) => {
    const res = await fetch(path, { method: "POST" })
    return res.json()
  },
}

const LogsPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-logs"],
    queryFn: () => Api.get("/admin/ai-seo/logs"),
  })

  const clear = useMutation({
    mutationFn: async () => Api.post("/admin/ai-seo/logs/clear"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-seo-logs"] }),
  })

  const logs: AuditLog[] = data?.logs || []

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">审计日志</Heading>
          <Text className="text-ui-fg-subtle">AI SEO 全部操作与错误记录</Text>
        </div>
        <Button variant="danger" onClick={() => clear.mutate()}>清空日志</Button>
      </div>

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>操作</Table.HeaderCell>
              <Table.HeaderCell>资源</Table.HeaderCell>
              <Table.HeaderCell>信息</Table.HeaderCell>
              <Table.HeaderCell>时间</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {logs.map((log) => (
              <Table.Row key={log.id}>
                <Table.Cell>{log.action}</Table.Cell>
                <Table.Cell>
                  {log.resource_type ? `${log.resource_type}:${log.resource_id || ""}` : "—"}
                </Table.Cell>
                <Table.Cell><Text className="text-xs">{log.message || "—"}</Text></Table.Cell>
                <Table.Cell>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</Table.Cell>
              </Table.Row>
            ))}
            {!logs.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无日志</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 日志",
  icon: Folder,
})

export default LogsPage
