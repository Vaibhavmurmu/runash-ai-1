import type { ChatMessage, ChatStatistics, StreamingPlatform } from "@/types/platform-chat"

type TransportMode = "sse" | "websocket"

interface PlatformConnectionConfig {
  streamId: string
  transport?: TransportMode
  credentials?: Record<string, unknown>
}

interface ChatTransportAdapter {
  start(config: PlatformConnectionConfig, onMessage: (message: ChatMessage) => void): () => void
}

class SseChatTransportAdapter implements ChatTransportAdapter {
  start(config: PlatformConnectionConfig, onMessage: (message: ChatMessage) => void) {
    const eventSource = new EventSource(`/api/streams/${config.streamId}/chat/sse`)
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { type?: string; data?: any[] }
        if (parsed.type !== "messages" || !Array.isArray(parsed.data)) return
        parsed.data.forEach((item) => {
          onMessage(normalizeInboundMessage(item))
        })
      } catch {
        // no-op
      }
    }

    return () => {
      eventSource.close()
    }
  }
}

class WebSocketChatTransportAdapter implements ChatTransportAdapter {
  start(config: PlatformConnectionConfig, onMessage: (message: ChatMessage) => void) {
    let stopped = false
    const poll = async () => {
      if (stopped) return
      try {
        const response = await fetch(`/api/streams/${config.streamId}/chat?limit=50`, { cache: "no-store" })
        if (response.ok) {
          const data = (await response.json()) as { messages?: any[] }
          ;(data.messages ?? []).slice(-5).forEach((item) => onMessage(normalizeInboundMessage(item)))
        }
      } finally {
        if (!stopped) {
          setTimeout(poll, 3000)
        }
      }
    }

    void poll()

    return () => {
      stopped = true
    }
  }
}

function normalizeInboundMessage(source: any): ChatMessage {
  const platform = (source.platform ?? source.metadata?.platform ?? "custom") as StreamingPlatform
  return {
    id: String(source.id ?? `${Date.now()}`),
    user: {
      id: String(source.user_id ?? source.userId ?? source.username ?? "unknown"),
      username: source.username ?? source.user?.username ?? "viewer",
      displayName: source.username ?? source.user?.displayName ?? source.user?.username ?? "Viewer",
      platform,
      roles: ["viewer"],
      badges: [],
      color: source.user?.color,
    },
    content: source.message ?? source.text ?? source.content ?? "",
    timestamp: new Date(source.timestamp ?? source.createdAt ?? Date.now()),
    platform,
    isDeleted: false,
    isHighlighted: false,
    isPinned: false,
    isAction: false,
    emotes: [],
    mentions: [],
  }
}

function deriveStats(messages: ChatMessage[], connected: StreamingPlatform[]): ChatStatistics[] {
  return connected.map((platform) => {
    const byPlatform = messages.filter((message) => message.platform === platform)
    const chatterCounts = new Map<string, number>()
    byPlatform.forEach((message) => {
      chatterCounts.set(message.user.username, (chatterCounts.get(message.user.username) ?? 0) + 1)
    })
    return {
      platform,
      messageCount: byPlatform.length,
      userCount: chatterCounts.size,
      newUserCount: chatterCounts.size,
      messageRate: byPlatform.length,
      topChatters: [...chatterCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([username, messageCount]) => ({ username, messageCount })),
      engagement: Math.min(100, byPlatform.length * 2),
    }
  })
}

export class PlatformChatService {
  private static instance: PlatformChatService
  private connectedPlatforms = new Set<StreamingPlatform>()
  private streamId: string | null = null
  private messageListeners: ((message: ChatMessage) => void)[] = []
  private statisticsListeners: ((stats: ChatStatistics[]) => void)[] = []
  private adapterCleanup: (() => void) | null = null
  private adapter: ChatTransportAdapter | null = null
  private messageBuffer: ChatMessage[] = []

  private constructor() {}

  public static getInstance(): PlatformChatService {
    if (!PlatformChatService.instance) PlatformChatService.instance = new PlatformChatService()
    return PlatformChatService.instance
  }

  public configureStream(streamId: string, transport: TransportMode = "sse") {
    this.streamId = streamId
    this.adapter = transport === "websocket" ? new WebSocketChatTransportAdapter() : new SseChatTransportAdapter()
  }

  public async connectToPlatform(platform: StreamingPlatform, credentials: Record<string, unknown>): Promise<boolean> {
    if (!this.streamId) return false
    this.connectedPlatforms.add(platform)

    if (!this.adapterCleanup && this.adapter) {
      this.adapterCleanup = this.adapter.start({ streamId: this.streamId, credentials }, (message) => {
        this.messageBuffer = [...this.messageBuffer, message].slice(-100)
        this.messageListeners.forEach((listener) => listener(message))
        const stats = deriveStats(this.messageBuffer, this.getConnectedPlatforms())
        this.statisticsListeners.forEach((listener) => listener(stats))
      })
    }

    return true
  }

  public async disconnectFromPlatform(platform: StreamingPlatform): Promise<boolean> {
    this.connectedPlatforms.delete(platform)
    if (this.connectedPlatforms.size === 0 && this.adapterCleanup) {
      this.adapterCleanup()
      this.adapterCleanup = null
    }
    return true
  }

  public isConnectedToPlatform(platform: StreamingPlatform): boolean {
    return this.connectedPlatforms.has(platform)
  }

  public getConnectedPlatforms(): StreamingPlatform[] {
    return [...this.connectedPlatforms]
  }

  public async sendMessage(content: string, platform: StreamingPlatform): Promise<boolean> {
    if (!this.streamId) return false
    const response = await fetch(`/api/streams/${this.streamId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content,
        platform,
        metadata: { connector: platform, source: "platform-chat-service" },
      }),
    })
    return response.ok
  }

  public async sendMessageToAll(content: string): Promise<{ [key in StreamingPlatform]?: boolean }> {
    const results: { [key in StreamingPlatform]?: boolean } = {}
    for (const platform of this.connectedPlatforms) {
      results[platform] = await this.sendMessage(content, platform)
    }
    return results
  }

  public onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter((listener) => listener !== callback)
    }
  }

  public onStatisticsUpdate(callback: (stats: ChatStatistics[]) => void): () => void {
    this.statisticsListeners.push(callback)
    return () => {
      this.statisticsListeners = this.statisticsListeners.filter((listener) => listener !== callback)
    }
  }
}
