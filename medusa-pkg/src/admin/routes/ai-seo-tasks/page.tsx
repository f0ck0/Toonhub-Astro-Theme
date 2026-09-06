import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ListCheckbox } from "@medusajs/icons"
import { Container, Heading, Text, Button, Select, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type Task = {
  id: string
  task_type: string
  status: string
  model: string | null
  attempts: number
  max_attempts: number
  error_message: string | null
  result: string | null
  created_at: string | null
}

const STATUS_COLORS: Record<string, "green" | "grey" | "orange" | "red" | "blue"> = {
  completed: "green",
  queued: "blue",
  running: "orange",
  retrying: "orange",
  failed: "red",
  cancelled: "grey",
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

const TasksPage = () => {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, isLoading } = useQuery({
    queryKey: ["ai-seo-tasks", statusFilter],
    queryFn: () => Api.get(`/admin/ai-seo/tasks${statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ai-seo-tasks"] })

  const retry = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/tasks/${id}/retry`),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: async (id: string) => Api.post(`/admin/ai-seo/tasks/${id}/cancel`),
    onSuccess: invalidate,
  })
  const clear = useMutation({
    mutationFn: async (scope: string) => Api.post("/admin/ai-seo/tasks/clear", { scope }),
    onSuccess: invalidate,
  })

  const tasks: Task[] = data?.tasks || []

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">任务队列</Heading>
          <Text className="text-ui-fg-subtle">AI SEO 异步任务(每 30 秒由 Worker 执行)</Text>
        </div>
        <div className="flex gap-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="all">全部</Select.Item>
              {["queued", "running", "completed", "failed", "retrying", "cancelled"].map((s) => (
                <Select.Item key={s} value={s}>{s}</Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Button variant="secondary" onClick={() => clear.mutate("all")}>清空已完成/失败</Button>
        </div>
      </div>

      {isLoading ? (
        <Text className="mt-4">加载中...</Text>
      ) : (
        <Table className="mt-4">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>类型</Table.HeaderCell>
              <Table.HeaderCell>状态</Table.HeaderCell>
              <Table.HeaderCell>模型</Table.HeaderCell>
              <Table.HeaderCell>尝试</Table.HeaderCell>
              <Table.HeaderCell>结果/错误</Table.HeaderCell>
              <Table.HeaderCell>操作</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {tasks.map((task) => (
              <Table.Row key={task.id}>
                <Table.Cell>{task.task_type}</Table.Cell>
                <Table.Cell>
                  <Badge color={STATUS_COLORS[task.status] || "grey"}>{task.status}</Badge>
                </Table.Cell>
                <Table.Cell>{task.model || "—"}</Table.Cell>
                <Table.Cell>{task.attempts}/{task.max_attempts}</Table.Cell>
                <Table.Cell>
                  <Text className="text-xs">{task.result || task.error_message || "—"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-x-1">
                    {task.status === "failed" && (
                      <Button size="small" variant="secondary" onClick={() => retry.mutate(task.id)}>重试</Button>
                    )}
                    {(task.status === "queued" || task.status === "running" || task.status === "retrying") && (
                      <Button size="small" variant="danger" onClick={() => cancel.mutate(task.id)}>取消</Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {!tasks.length && (
              <Table.Row>
                <Table.Cell><Text className="text-ui-fg-subtle">暂无任务</Text></Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "AI SEO 任务",
  icon: ListCheckbox,
})

export default TasksPage
