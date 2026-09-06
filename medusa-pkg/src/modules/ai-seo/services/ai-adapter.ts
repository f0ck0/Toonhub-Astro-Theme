/**
 * OpenAI 兼容 Chat 客户端。对应 Spree 的 Toonhub::AiAdapter。
 * 支持 openai / deepseek / openrouter / azure_openai / openai_compatible。
 */
export interface AiChatOptions {
  prompt: string
  system?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AiProviderLike {
  id: string
  provider_type: string
  base_url: string | null
  default_model: string | null
  api_key: string | null
  enabled: boolean
}

export class AiAdapterError extends Error {}

export class AiAdapter {
  constructor(private readonly provider: AiProviderLike) {}

  async testConnection(): Promise<string> {
    const text = await this.chat({
      prompt: "Reply with exactly: Toonhub AI OK",
      model: this.provider.default_model || undefined,
      temperature: 0,
    })
    return text || "OK"
  }

  async listModels(): Promise<string[]> {
    if (this.provider.provider_type === "azure_openai") {
      const m = this.provider.default_model || undefined
      return m ? [m] : []
    }
    try {
      const res = await fetch(`${this.baseUrl()}/models`, {
        headers: { Authorization: `Bearer ${this.provider.api_key}` },
      })
      if (!res.ok) throw new AiAdapterError(`Model fetch failed: ${res.status} ${await res.text()}`)
      const json = (await res.json()) as { data?: Array<{ id?: string }> }
      const models = (json.data || []).map((item) => item.id).filter(Boolean) as string[]
      return models.length ? models : [this.provider.default_model || this.fallbackModel()].filter(Boolean)
    } catch (error) {
      if (error instanceof AiAdapterError) throw error
      return [this.provider.default_model || this.fallbackModel()].filter(Boolean)
    }
  }

  async chat(options: AiChatOptions): Promise<string> {
    if (!this.provider.enabled) throw new AiAdapterError("AI provider disabled")
    if (!this.provider.api_key) throw new AiAdapterError("AI API key is missing")

    if (this.provider.provider_type === "azure_openai") return this.azureChat(options)
    return this.openaiCompatibleChat(options)
  }

  private async openaiCompatibleChat(options: AiChatOptions): Promise<string> {
    const payload: Record<string, unknown> = {
      model: options.model || this.provider.default_model || this.fallbackModel(),
      messages: [
        ...(options.system ? [{ role: "system", content: options.system }] : []),
        { role: "user", content: options.prompt },
      ],
      temperature: options.temperature ?? 0.7,
    }
    if (options.maxTokens) payload.max_tokens = options.maxTokens

    const res = await fetch(`${this.baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.provider.api_key}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new AiAdapterError(`AI request failed: ${res.status} ${await res.text()}`)
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return json.choices?.[0]?.message?.content?.toString() || ""
  }

  private async azureChat(options: AiChatOptions): Promise<string> {
    const deployment = options.model || this.provider.default_model
    if (!deployment) throw new AiAdapterError("Azure OpenAI deployment/model is required")
    const payload: Record<string, unknown> = {
      messages: [
        ...(options.system ? [{ role: "system", content: options.system }] : []),
        { role: "user", content: options.prompt },
      ],
      temperature: options.temperature ?? 0.7,
    }
    if (options.maxTokens) payload.max_tokens = options.maxTokens

    const res = await fetch(
      `${this.baseUrl()}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-06-01`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": this.provider.api_key! },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) throw new AiAdapterError(`AI request failed: ${res.status} ${await res.text()}`)
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return json.choices?.[0]?.message?.content?.toString() || ""
  }

  private baseUrl(): string {
    const custom = (this.provider.base_url || "").trim().replace(/\/+$/, "")
    if (custom) return custom
    switch (this.provider.provider_type) {
      case "deepseek":
        return "https://api.deepseek.com/v1"
      case "openrouter":
        return "https://openrouter.ai/api/v1"
      default:
        return "https://api.openai.com/v1"
    }
  }

  private fallbackModel(): string {
    switch (this.provider.provider_type) {
      case "deepseek":
        return "deepseek-chat"
      case "openrouter":
        return "openai/gpt-4o-mini"
      default:
        return "gpt-4o-mini"
    }
  }
}
