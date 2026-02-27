"use client"

import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Leaf, Settings, History, Bot, Mic, Search, Zap, WandSparkles, OctagonX } from "lucide-react"
import type { ChatMessage, ChatSession, UserPreferences, QuickAction } from "@/types/runash-chat"
import ChatMessageComponent from "@/components/chat/chat-message"
import ChatSidebar from "@/components/chat/chat-sidebar"
import UserPreferencesDialog from "@/components/chat/user-preferences-dialog"
import CartDrawer from "@/components/cart/cart-drawer"
import VoiceControls from "@/components/chat/voice-controls"
import { RunAshChatComposer } from "@/components/chat/runash-chat-composer"
import { RunAshChatCommandCenter } from "@/components/chat/runash-chat-command-center"
import {
  ActionPill,
  ChatDataState,
  ChatInfoBanner,
  ChatPageFrame,
  ChatShellHeader,
  ChatSurfaceCard,
  SuggestionCardGrid,
  type SuggestionCardItem,
} from "@/components/chat/shared-chat-primitives"
import { useDashboardModelDialog } from "@/components/dashboard/model-dialog-provider"
import { buildRunAshChatQuickActions } from "@/lib/runash-chat/quick-actions"
import { resolveRequestedToolsForMessage } from "@/lib/runash-chat/tooling"
 
import { getRecommendedProducts, shouldRecommendProducts } from "@/lib/chat-product-recommendations"



export function ChatWorkspace() {
  type StreamControllerState = "idle" | "sending" | "streaming" | "stopping" | "failed"
  type ComposerHealthState = "ready" | "usage-limit" | "provider-error" | "network-timeout"
  type ResponseTone = "balanced" | "friendly" | "professional"
  type ResponseDetailLevel = "concise" | "normal" | "detailed"
  type ChatRunDiagnostics = { requestId: string | null; provider: string | null; model: string | null; lastErrorCode: string | null }
  type ModelCatalogEntry = { id: string; provider: string; label: string }

  const { openFromTrigger } = useDashboardModelDialog()
  const searchParams = useSearchParams()
  const querySessionId = searchParams.get("sessionId")
  const queryStreamId = searchParams.get("streamId")
  const queryProjectName = searchParams.get("projectName")
  const queryLibraryItemTitle = searchParams.get("libraryItemTitle")
  const bootstrapCompletedRef = useRef(false)
  const [bootstrapProjectName, setBootstrapProjectName] = useState<string | null>(null)
  const defaultAssistantMessage: ChatMessage = {
    id: "1",
    content:
      "Hello! I'm RunAshChat, your AI assistant for organic products, sustainable living, recipes, and retailing automation. How can I help you today?",
    role: "assistant",
    timestamp: new Date(),
    type: "text",
  }

  const [messages, setMessages] = useState<ChatMessage[]>([defaultAssistantMessage])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [streamControllerState, setStreamControllerState] = useState<StreamControllerState>("idle")
  const [composerHealth, setComposerHealth] = useState<ComposerHealthState>("ready")
  const [lastPromptForRetry, setLastPromptForRetry] = useState<string | null>(null)
  const [selectedTone, setSelectedTone] = useState<ResponseTone>("balanced")
  const [detailLevel, setDetailLevel] = useState<ResponseDetailLevel>("normal")
  const [runDiagnostics, setRunDiagnostics] = useState<ChatRunDiagnostics>({ requestId: null, provider: null, model: null, lastErrorCode: null })
  const [modelCatalog, setModelCatalog] = useState<ModelCatalogEntry[]>([])
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini")
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const storedState = window.localStorage.getItem("runash_chat_left_drawer_open")
    if (storedState === null) return window.innerWidth >= 1024
    return storedState === "true"
  })
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const storedState = window.localStorage.getItem("runash_chat_right_drawer_open")
    if (storedState === null) return window.innerWidth >= 1024
    return storedState === "true"
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendAbortRef = useRef<AbortController | null>(null)

  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    if (typeof window === "undefined") {
      return {
        dietaryRestrictions: [],
        sustainabilityPriority: "medium",
        budgetRange: [0, 100],
        preferredCategories: [],
        cookingSkillLevel: "intermediate",
      }
    }

    try {
      const stored = window.localStorage.getItem("runash_chat_preferences")
      if (!stored) {
        return {
          dietaryRestrictions: [],
          sustainabilityPriority: "medium",
          budgetRange: [0, 100],
          preferredCategories: [],
          cookingSkillLevel: "intermediate",
        }
      }

      const parsed = JSON.parse(stored) as Partial<UserPreferences>
      return {
        dietaryRestrictions: Array.isArray(parsed.dietaryRestrictions) ? parsed.dietaryRestrictions : [],
        sustainabilityPriority:
          parsed.sustainabilityPriority === "low" || parsed.sustainabilityPriority === "high"
            ? parsed.sustainabilityPriority
            : "medium",
        budgetRange:
          Array.isArray(parsed.budgetRange) && parsed.budgetRange.length === 2
            ? [Number(parsed.budgetRange[0]) || 0, Number(parsed.budgetRange[1]) || 100]
            : [0, 100],
        preferredCategories: Array.isArray(parsed.preferredCategories) ? parsed.preferredCategories : [],
        cookingSkillLevel:
          parsed.cookingSkillLevel === "beginner" || parsed.cookingSkillLevel === "advanced"
            ? parsed.cookingSkillLevel
            : "intermediate",
        businessType: parsed.businessType,
      }
    } catch {
      return {
        dietaryRestrictions: [],
        sustainabilityPriority: "medium",
        budgetRange: [0, 100],
        preferredCategories: [],
        cookingSkillLevel: "intermediate",
      }
    }
  })

  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceTranscriptHistory, setVoiceTranscriptHistory] = useState<string[]>([])
  const [sessionsStatus, setSessionsStatus] = useState<"loading" | "ready" | "error">("loading")

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "Organic Breakfast Ideas",
      messages: [
        {
          id: "s1-1",
          content: "Can you suggest a few organic vegan breakfast ideas under $20?",
          role: "user",
          timestamp: new Date(Date.now() - 86400000),
          type: "text",
        },
        {
          id: "s1-2",
          content: "Absolutely — try overnight oats, tofu scramble wraps, and fruit-chia parfaits.",
          role: "assistant",
          timestamp: new Date(Date.now() - 86300000),
          type: "text",
        },
      ],
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000),
      context: {
        preferences: {
          dietaryRestrictions: ["vegan"],
          sustainabilityPriority: "high",
          budgetRange: [0, 50],
          preferredCategories: ["fruits-vegetables"],
          cookingSkillLevel: "beginner",
        },
        currentCart: [],
        recentSearches: ["organic oats", "plant milk"],
      },
    },
    {
      id: "2",
      title: "Store Automation Setup",
      messages: [
        {
          id: "s2-1",
          content: "How do I automate low-stock alerts for my store?",
          role: "user",
          timestamp: new Date(Date.now() - 172800000),
          type: "text",
        },
        {
          id: "s2-2",
          content: "Set reorder thresholds per SKU and trigger notifications when inventory drops below limits.",
          role: "assistant",
          timestamp: new Date(Date.now() - 172700000),
          type: "text",
        },
      ],
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 172800000),
      context: {
        preferences: {
          dietaryRestrictions: [],
          sustainabilityPriority: "medium",
          budgetRange: [0, 1000],
          preferredCategories: [],
          cookingSkillLevel: "intermediate",
          businessType: "retail",
        },
        currentCart: [],
        recentSearches: ["inventory management", "POS system"],
      },
    },
    {
      id: "3",
      title: "Sustainable Living Tips",
      messages: [
        {
          id: "s3-1",
          content: "What are easy ways to reduce daily household waste?",
          role: "user",
          timestamp: new Date(Date.now() - 259200000),
          type: "text",
        },
        {
          id: "s3-2",
          content: "Start with reusable bags, meal planning, and composting food scraps.",
          role: "assistant",
          timestamp: new Date(Date.now() - 259100000),
          type: "text",
        },
      ],
      createdAt: new Date(Date.now() - 259200000),
      updatedAt: new Date(Date.now() - 259200000),
      context: {
        preferences: {
          dietaryRestrictions: [],
          sustainabilityPriority: "high",
          budgetRange: [0, 100],
          preferredCategories: [],
          cookingSkillLevel: "advanced",
        },
        currentCart: [],
        recentSearches: ["zero waste", "renewable energy"],
      },
    },
  ])

  const quickActions: QuickAction[] = useMemo(
    () =>
      buildRunAshChatQuickActions({
        onPrompt: (prompt) => handleQuickAction(prompt),
        onSearch: (prompt) => handleQuickAction(prompt, "search"),
        openModelConfigurator: (trigger) =>
          openFromTrigger(
            {
              triggerSource: "chat",
              mode: "configure",
              model: {
                modelId: "runash-chat-router",
                provider: "RunAsh AI",
                displayName: "RunAsh Chat Optimizer",
              },
              payload: { prompt: "Optimize this chat workflow for quality, latency, and cost." },
            },
            trigger,
          ),
      }),
    [openFromTrigger],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    let active = true

    const loadModelCatalog = async () => {
      try {
        const response = await fetch("/api/ai/models", { cache: "no-store" })
        if (!response.ok) return
        const payload = (await response.json()) as { models?: ModelCatalogEntry[]; defaultModel?: string }
        if (!active) return
        const options = Array.isArray(payload.models) ? payload.models : []
        setModelCatalog(options)
        if (payload.defaultModel && options.some((item) => item.id === payload.defaultModel)) {
          setSelectedModel(payload.defaultModel)
        }
      } catch {
        // model catalog endpoint is optional; keep default model
      }
    }

    void loadModelCatalog()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort("unmount")
    }
  }, [])


  useEffect(() => {
    const syncViewport = () => {
      if (typeof window === "undefined") return
      setIsDesktop(window.innerWidth >= 1024)
    }

    syncViewport()
    window.addEventListener("resize", syncViewport)

    return () => {
      window.removeEventListener("resize", syncViewport)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem("runash_chat_left_drawer_open", String(leftDrawerOpen))
      window.localStorage.setItem("runash_chat_right_drawer_open", String(rightDrawerOpen))
    } catch {
      // ignore storage errors
    }
  }, [leftDrawerOpen, rightDrawerOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "[") {
        event.preventDefault()
        setLeftDrawerOpen((prev) => !prev)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "]") {
        event.preventDefault()
        setRightDrawerOpen((prev) => !prev)
        return
      }

      if (isEditable || !event.altKey) return

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setLeftDrawerOpen((prev) => !prev)
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        setRightDrawerOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  useEffect(() => {
 
    try {
      window.localStorage.setItem("runash_chat_preferences", JSON.stringify(userPreferences))
    } catch {
      // ignore storage errors
    }
  }, [userPreferences])

  useEffect(() => {


    ;(async () => {
      try {
        setSessionsStatus("loading")
        const response = await fetch("/api/sessions")
        if (!response.ok) throw new Error("Unable to load sessions")
        const payload = await response.json()
        const listed = Array.isArray(payload?.data) ? payload.data : []
        if (listed.length === 0) {
          setSessionsStatus("ready")
          return
        }

        setChatSessions((previous) => {
          const mapped = listed.map((entry: { id: string; title?: string; created_at?: string }) => ({
            id: String(entry.id),
            title: entry.title ?? "Session",
            messages: [],
            createdAt: new Date(entry.created_at ?? Date.now()),
            updatedAt: new Date(entry.created_at ?? Date.now()),
            context: {
              preferences: {
                dietaryRestrictions: [],
                sustainabilityPriority: "medium" as const,
                budgetRange: [0, 100] as [number, number],
                preferredCategories: [],
                cookingSkillLevel: "intermediate" as const,
              },
              currentCart: [],
              recentSearches: [],
            },
          }))

          return [...mapped, ...previous.filter((session) => !mapped.some((item) => item.id === session.id))]
        })
        setSessionsStatus("ready")
      } catch {
        setSessionsStatus("error")
        // keep local fallback sessions when api is unavailable
      }
    })()
  }, [])

  const loadSession = (session: ChatSession) => {
    setCurrentSession(session)
    setMessages(session.messages.length > 0 ? session.messages : [defaultAssistantMessage])
  }

  const handleNewChatSession = () => {
    setCurrentSession(null)
    setMessages([defaultAssistantMessage])
    setInputValue("")
    setComposerHealth("ready")
    setStreamControllerState("idle")
  }

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions((prev) => prev.filter((session) => session.id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([defaultAssistantMessage])
    }
  }

  useEffect(() => {
    if (!querySessionId) return

    const matchedSession = chatSessions.find((session) => session.id === querySessionId)
    if (!matchedSession) return

    loadSession(matchedSession)
  }, [querySessionId, chatSessions])

  useEffect(() => {
    if (bootstrapCompletedRef.current) return

    bootstrapCompletedRef.current = true
    const rawContext = localStorage.getItem("runash_chat_bootstrap_context")
    if (rawContext) {
      try {
        const context = JSON.parse(rawContext) as { projectName?: string; templateName?: string; libraryItemIds?: string[] }
        if (context.projectName) {
          setBootstrapProjectName(context.projectName)
          setMessages((prev) => [
            ...prev,
            {
              id: `bootstrap-${Date.now()}`,
              content: `Loaded project context: ${context.projectName}${context.templateName ? ` (${context.templateName})` : ""}.`,
              role: "assistant",
              timestamp: new Date(),
              type: "text",
              status: "completed",
            },
          ])
        }
      } catch {
        // ignore malformed bootstrap context
      }
    }

    const storedPrompt = localStorage.getItem("runash_initial_prompt")?.trim()
    if (!storedPrompt) return

    localStorage.removeItem("runash_initial_prompt")
    handleSendMessage(storedPrompt)
  }, [])

  const stopStreamingResponse = () => {
    if (streamControllerState !== "sending" && streamControllerState !== "streaming") return
    setStreamControllerState("stopping")
    sendAbortRef.current?.abort("user_stop")
  }

  const applyComposerModifiers = (prompt: string) => {
    const toneInstruction =
      selectedTone === "friendly"
        ? "Use a warm, approachable tone."
        : selectedTone === "professional"
          ? "Use a professional, concise business tone."
          : "Use a balanced, helpful tone."

    const detailInstruction =
      detailLevel === "concise"
        ? "Keep the response concise with only key points."
        : detailLevel === "detailed"
          ? "Provide a detailed response with clear steps and context."
          : "Provide a normal level of detail."

    return `${prompt}

[Response style instructions]
- ${toneInstruction}
- ${detailInstruction}`
  }

  const retryLastPrompt = () => {
    if (!lastPromptForRetry) return
    setComposerHealth("ready")
    void handleSendMessage(lastPromptForRetry)
  }

  const handleQuickAction = async (message: string, mode: QuickAction["category"] = "product") => {
    setInputValue(message)

    if (mode === "search") {
      const userMessage: ChatMessage = {
        id: `${Date.now()}-search-user`,
        content: message,
        role: "user",
        timestamp: new Date(),
        type: "text",
        status: "completed",
      }

      setMessages((prev) => [...prev, userMessage])
      setIsTyping(true)

      try {
        const response = await fetch(`/api/web-search?query=${encodeURIComponent(message)}`)
        const payload = await response.json()
        const searchResults = Array.isArray(payload?.data?.results) ? payload.data.results : []

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-search-assistant`,
            content: "Here are top product search results from EXA/MCP-compatible providers.",
            role: "assistant",
            timestamp: new Date(),
            type: "text",
            status: "completed",
            metadata: { searchResults },
          },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-search-error`,
            content: "Web search is unavailable right now. Please try again in a moment.",
            role: "assistant",
            timestamp: new Date(),
            type: "text",
            status: "failed",
          },
        ])
      } finally {
        setIsTyping(false)
      }

      return
    }

    void handleSendMessage(message)
  }

  const handleSendMessage = async (messageContent?: string) => {
    if (streamControllerState === "sending" || streamControllerState === "streaming") return

    const content = messageContent || inputValue.trim()
    if (!content) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
      type: "text",
      status: "completed",
    }

    const assistantId = `${Date.now()}-assistant`
    const assistantMessage: ChatMessage = {
      id: assistantId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      type: "text",
      status: "queued",
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInputValue("")
    setIsTyping(true)
    setStreamControllerState("sending")
    setComposerHealth("ready")
    setLastPromptForRetry(content)
    setRunDiagnostics({ requestId: null, provider: "RunAsh AI", model: null, lastErrorCode: null })

    const abortController = new AbortController()
    sendAbortRef.current = abortController
    const timeoutId = window.setTimeout(() => {
      abortController.abort("timeout")
    }, 45000)

    try {
      const requestedTools = resolveRequestedToolsForMessage(content)
      const normalizedContent = applyComposerModifiers(content)

      const toolPayloads = undefined

      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          sessionId: currentSession?.id ?? querySessionId ?? undefined,
          title: currentSession?.title ?? "RunAsh Agent Session",
          message: normalizedContent,
          model: selectedModel,
          provider: modelCatalog.find((entry) => entry.id === selectedModel)?.provider,
          tools: requestedTools,
          toolPayloads,
        }),
      })

      setRunDiagnostics((previous) => ({
        ...previous,
        requestId: response.headers.get("x-request-id") || previous.requestId,
        provider: response.headers.get("x-provider") || previous.provider || "RunAsh AI",
      }))

      if (response.status === 429) {
        setComposerHealth("usage-limit")
        setStreamControllerState("failed")
        throw new Error("usage_limit_reached")
      }

      if (response.status >= 500) {
        setComposerHealth("provider-error")
        setStreamControllerState("failed")
        throw new Error("provider_error")
      }

      if (!response.ok || !response.body) {
        setStreamControllerState("failed")
        throw new Error("stream_request_failed")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const updateAssistantMessage = (updater: (existing: ChatMessage) => ChatMessage) => {
        setMessages((prev) => prev.map((item) => (item.id === assistantId ? updater(item) : item)))
      }

      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break

        buffer += decoder.decode(chunk.value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""

        for (const rawEvent of events) {
          const eventName = rawEvent.match(/event:\s*(.+)/)?.[1]?.trim() ?? "message"
          const payloadLine = rawEvent
            .split("\n")
            .find((line) => line.startsWith("data:"))
            ?.replace(/^data:\s*/, "")

          if (!payloadLine) continue
          const payload = JSON.parse(payloadLine)
          const payloadRequestId =
            typeof payload.requestId === "string"
              ? payload.requestId
              : typeof payload.request_id === "string"
                ? payload.request_id
                : typeof payload.result?.request_id === "string"
                  ? payload.result.request_id
                  : null
          const payloadProvider =
            typeof payload.provider === "string"
              ? payload.provider
              : typeof payload.modelProvider === "string"
                ? payload.modelProvider
                : typeof payload.result?.provider === "string"
                  ? payload.result.provider
                  : null
          const payloadModel =
            typeof payload.model === "string"
              ? payload.model
              : typeof payload.modelId === "string"
                ? payload.modelId
                : typeof payload.result?.model === "string"
                  ? payload.result.model
                  : null

          if (payloadRequestId || payloadProvider || payloadModel) {
            setRunDiagnostics((previous) => ({
              requestId: payloadRequestId || previous.requestId,
              provider: payloadProvider || previous.provider || "RunAsh AI",
              model: payloadModel || previous.model,
              lastErrorCode: previous.lastErrorCode,
            }))
          }

          if (eventName === "token") {
            setStreamControllerState("streaming")
            updateAssistantMessage((existing) => ({
              ...existing,
              status: "streaming",
              content: `${existing.content}${String(payload.token ?? "")}`,
            }))
          }

          if (eventName === "tool_start") {
            updateAssistantMessage((existing) => ({ ...existing, status: "tool-running" }))
          }

          if (eventName === "tool_result" && payload.tool === "initiate_link_checkout") {
            const linkPayload = (payload.result?.handoff_contract ?? payload.result?.resolved_handoff_contract ?? {}) as Record<string, unknown>
            const productMetadata =
              linkPayload && typeof linkPayload.product_metadata === "object" && linkPayload.product_metadata !== null
                ? (linkPayload.product_metadata as Record<string, unknown>)
                : undefined
            const tags = Array.isArray(productMetadata?.tags)
              ? productMetadata.tags.filter((tag): tag is string => typeof tag === "string")
              : []
            const amountMinor = typeof linkPayload?.amount === "number" ? linkPayload.amount : 0
            const taxPreview =
              typeof payload.result?.activity_summary?.tax === "number"
                ? payload.result.activity_summary.tax
                : Number(payload.result?.tax ?? Number.NaN)
            const subtotal =
              typeof payload.result?.activity_summary?.subtotal === "number"
                ? payload.result.activity_summary.subtotal
                : Number.NaN
            const total =
              typeof payload.result?.activity_summary?.total === "number"
                ? payload.result.activity_summary.total
                : Number.NaN
            const taxLabel =
              typeof payload.result?.activity_summary?.tax_label === "string" ? payload.result.activity_summary.tax_label : undefined
            const taxRatePercent =
              typeof payload.result?.activity_summary?.tax_rate_percent === "number"
                ? payload.result.activity_summary.tax_rate_percent
                : undefined
            const blockedReason =
              typeof payload.result?.blocked_reason === "string" ? payload.result.blocked_reason : undefined
            const checkoutId =
              typeof payload.result?.activity_summary_payload?.checkoutId === "string"
                ? payload.result.activity_summary_payload.checkoutId
                : typeof payload.result?.checkout_session_id === "string"
                  ? payload.result.checkout_session_id
                  : undefined
            const nextAction =
              typeof payload.result?.activity_summary_payload?.nextAction === "string"
                ? payload.result.activity_summary_payload.nextAction
                : typeof payload.result?.next_action === "string"
                  ? payload.result.next_action
                  : undefined
            const requestId =
              typeof payload.result?.activity_summary_payload?.requestId === "string"
                ? payload.result.activity_summary_payload.requestId
                : undefined
            const checkoutStatusRaw =
              typeof payload.result?.status === "string"
                ? payload.result.status
                : typeof payload.result?.execution_activity_summary?.status === "string"
                  ? payload.result.execution_activity_summary.status
                  : ""
            const checkoutState: "idle" | "processing" | "success" | "failed" =
              checkoutStatusRaw === "initiated"
                ? "success"
                : checkoutStatusRaw === "failed" || checkoutStatusRaw === "validation_failed"
                  ? "failed"
                  : "idle"
            const requestCorrelationId =
              typeof payload.result?.execution_activity_summary?.request_correlation_id === "string"
                ? payload.result.execution_activity_summary.request_correlation_id
                : typeof payload.result?.request_id === "string"
                  ? payload.result.request_id
                  : requestId

            const attemptedMethods = Array.isArray(payload.result?.attempted_methods)
              ? payload.result.attempted_methods.filter((entry: unknown): entry is string => typeof entry === "string" && entry.length > 0)
              : Array.isArray(payload.result?.attemptedMethods)
                ? payload.result.attemptedMethods.filter((entry: unknown): entry is string => typeof entry === "string" && entry.length > 0)
                : undefined

            const attemptTimeline = Array.isArray(payload.result?.attempt_timeline)
              ? payload.result.attempt_timeline
                  .map((entry: unknown) => {
                    const timelineEntry = entry as Record<string, unknown>
                    const method = typeof timelineEntry.method === "string" ? timelineEntry.method : null
                    const reason =
                      timelineEntry.reason === "primary" || timelineEntry.reason === "fallback_retry" || timelineEntry.reason === "no_retry"
                        ? timelineEntry.reason
                        : null
                    const status = timelineEntry.status === "initiated" || timelineEntry.status === "failed" ? timelineEntry.status : null
                    const timestamp = typeof timelineEntry.timestamp === "string" ? timelineEntry.timestamp : null

                    if (!method || !reason || !status || !timestamp) return null
                    return { method, reason, status, timestamp }
                  })
                  .filter((entry): entry is { method: string; reason: "primary" | "fallback_retry" | "no_retry"; status: "initiated" | "failed"; timestamp: string } => entry !== null)
              : undefined

            updateAssistantMessage((existing) => ({
              ...existing,
              metadata: {
                ...existing.metadata,
                linkQuickPay: {
                  itemName:
                    typeof productMetadata?.item_name === "string" ? productMetadata.item_name : "RunAshChat Instant Checkout Item",
                  amountMinor,
                  currency: linkPayload?.currency === "INR" ? "INR" : "USD",
                  eligibleForLink: true,
                  last4: "4242",
                  tags,
                  taxPreview: Number.isFinite(taxPreview) ? taxPreview : undefined,
                  subtotal: Number.isFinite(subtotal) ? subtotal : undefined,
                  taxAmount: Number.isFinite(taxPreview) ? taxPreview : undefined,
                  totalAmount: Number.isFinite(total) ? total : undefined,
                  taxLabel: taxLabel === "GST" || taxLabel === "VAT" || taxLabel === "Sales Tax" ? taxLabel : undefined,
                  taxRatePercent,
                  blockedReason,
                  status: checkoutState,
                  requestCorrelationId,
                  checkoutId,
                  nextAction,
                  attemptedMethods,
                  attemptTimeline,
                  confirmationPayload: {
                    merchant_id: typeof linkPayload?.merchant_id === "string" ? linkPayload.merchant_id : "runash-default-merchant",
                    amount: amountMinor,
                    currency: linkPayload?.currency === "INR" ? "INR" : "USD",
                    idempotency_key:
                      typeof linkPayload?.idempotency_key === "string" ? linkPayload.idempotency_key : undefined,
                    product_metadata: {
                      item_name:
                        typeof productMetadata?.item_name === "string"
                          ? productMetadata.item_name
                          : "RunAshChat Instant Checkout Item",
                      sku: typeof productMetadata?.sku === "string" ? productMetadata.sku : "runashchat-instant-checkout",
                      tags,
                    },
                    country: typeof linkPayload?.country === "string" ? linkPayload.country : undefined,
                    region: typeof linkPayload?.region === "string" ? linkPayload.region : undefined,
                    chat_context:
                      linkPayload && typeof linkPayload.chat_context === "object" && linkPayload.chat_context !== null
                        ? {
                            session_id:
                              typeof (linkPayload.chat_context as Record<string, unknown>).session_id === "string"
                                ? ((linkPayload.chat_context as Record<string, unknown>).session_id as string)
                                : currentSession?.id ?? querySessionId ?? "",
                            user_intent:
                              typeof (linkPayload.chat_context as Record<string, unknown>).user_intent === "string"
                                ? ((linkPayload.chat_context as Record<string, unknown>).user_intent as string)
                                : content,
                          }
                        : undefined,
                  },
                },
              },
            }))
          }

          if (eventName === "final") {
            updateAssistantMessage((existing) => ({
              ...existing,
              status: payload.status === "completed" ? "completed" : existing.status,
              content: typeof payload.content === "string" && payload.content.length > 0 ? payload.content : existing.content,
            }))
          }

          if (eventName === "error") {
            setComposerHealth("provider-error")
            setStreamControllerState("failed")
            setRunDiagnostics((previous) => ({
              ...previous,
              lastErrorCode: typeof payload.code === "string" ? payload.code : typeof payload.errorCode === "string" ? payload.errorCode : "PROVIDER_ERROR",
            }))
            updateAssistantMessage((existing) => ({ ...existing, status: "failed" }))
          }
        }
      }
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === "AbortError"
      const timeoutAbort = abortController.signal.reason === "timeout"

      if (isAbortError && abortController.signal.reason === "user_stop") {
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === assistantId
              ? {
                  ...entry,
                  status: "completed",
                  content: entry.content || "Stopped. You can retry from the composer.",
                }
              : entry,
          ),
        )
        setStreamControllerState("idle")
      } else if (isAbortError && timeoutAbort) {
        setComposerHealth("network-timeout")
        setStreamControllerState("failed")
        setRunDiagnostics((previous) => ({ ...previous, lastErrorCode: "NETWORK_TIMEOUT" }))
      } else {
        setComposerHealth((prev) => (prev === "ready" ? "provider-error" : prev))
        setStreamControllerState("failed")
        setRunDiagnostics((previous) => ({ ...previous, lastErrorCode: previous.lastErrorCode || "STREAM_REQUEST_FAILED" }))
        const fallback = buildAssistantResponse(content)
        setMessages((prev) => prev.map((entry) => (entry.id === assistantId ? { ...fallback, id: assistantId } : entry)))
      }
    } finally {
      window.clearTimeout(timeoutId)
      sendAbortRef.current = null
      setStreamControllerState((prev) => (prev === "stopping" ? "idle" : prev === "streaming" || prev === "sending" ? "idle" : prev))
      setIsTyping(false)
    }
  }

 
  const buildAssistantResponse = (userInput: string): ChatMessage => {
    const input = userInput.toLowerCase()

    // Product recommendations
    if (shouldRecommendProducts(input)) {
      const products = getRecommendedProducts(input, userPreferences)
      const hasProducts = products.length > 0
      const productText = hasProducts
        ? `Here are ${products.length} grocery products matched to your budget and preferences:`
        : "I couldn't find products matching all filters, but I can broaden the criteria if you'd like."

      return {
        id: Date.now().toString(),
        content: productText,
        role: "assistant",
        timestamp: new Date(),
        type: "product",
        metadata: {
          products,
        },
      }
    }

    // Recipe suggestions
    if (input.includes("recipe") || input.includes("cook") || input.includes("meal")) {
      return {
        id: Date.now().toString(),
        content: "Here are some sustainable recipes perfect for your cooking level:",
        role: "assistant",
        timestamp: new Date(),
        type: "recipe",
        metadata: {
          recipes: [
            {
              id: "1",
              name: "Organic Quinoa Buddha Bowl",
              description:
                "A nutritious and colorful bowl with organic quinoa, seasonal vegetables, and tahini dressing",
              difficulty: "easy",
              prepTime: 15,
              cookTime: 20,
              servings: 2,
              ingredients: [
                { id: "1", name: "Organic Quinoa", amount: "1", unit: "cup", isOrganic: true },
                { id: "2", name: "Organic Kale", amount: "2", unit: "cups", isOrganic: true },
                { id: "3", name: "Organic Chickpeas", amount: "1", unit: "can", isOrganic: true },
              ],
              instructions: [
                "Rinse quinoa and cook according to package instructions",
                "Massage kale with olive oil and lemon juice",
                "Drain and rinse chickpeas",
                "Arrange all ingredients in bowls and drizzle with tahini dressing",
              ],
              image: "/placeholder.svg?height=300&width=400",
              tags: ["vegan", "gluten-free", "high-protein"],
              sustainabilityScore: 9,
              nutritionalInfo: {
                calories: 420,
                protein: 18,
                carbs: 65,
                fat: 12,
                fiber: 12,
                sugar: 8,
                sodium: 380,
              },
            },
          ],
        },
      }
    }

    // Sustainability tips
    if (
      input.includes("sustainable") ||
      input.includes("eco") ||
      input.includes("environment") ||
      input.includes("carbon")
    ) {
      return {
        id: Date.now().toString(),
        content: "Here are some sustainability tips to help reduce your environmental impact:",
        role: "assistant",
        timestamp: new Date(),
        type: "tip",
        metadata: {
          tips: [
            {
              id: "1",
              title: "Buy Local and Seasonal",
              description:
                "Choose locally grown, seasonal produce to reduce transportation emissions and support local farmers.",
              category: "food",
              impact: "high",
              difficulty: "easy",
              estimatedSavings: 25,
            },
            {
              id: "2",
              title: "Reduce Food Waste",
              description: "Plan meals, store food properly, and compost scraps to minimize waste.",
              category: "waste",
              impact: "high",
              difficulty: "medium",
              estimatedSavings: 40,
            },
          ],
        },
      }
    }

    // Automation suggestions
    if (
      input.includes("automat") ||
      input.includes("business") ||
      input.includes("retail") ||
      input.includes("inventory")
    ) {
      return {
        id: Date.now().toString(),
        content: "Here are automation suggestions to optimize your organic retail business:",
        role: "assistant",
        timestamp: new Date(),
        type: "automation",
        metadata: {
          automationSuggestions: [
            {
              id: "1",
              title: "Smart Inventory Management",
              description:
                "Implement AI-powered inventory tracking to predict demand and reduce waste of perishable organic products.",
              category: "inventory",
              complexity: "moderate",
              estimatedROI: 35,
              implementationTime: "2-4 weeks",
              tools: ["RFID tags", "Inventory software", "Demand forecasting AI"],
            },
            {
              id: "2",
              title: "Automated Customer Segmentation",
              description:
                "Use customer data to automatically segment buyers and send personalized organic product recommendations.",
              category: "marketing",
              complexity: "simple",
              estimatedROI: 28,
              implementationTime: "1-2 weeks",
              tools: ["CRM software", "Email automation", "Analytics platform"],
            },
          ],
        },
      }
    }

    // Default response
    return {
      id: Date.now().toString(),
      content:
        "I can help you with organic products, sustainable living tips, eco-friendly recipes, and retailing automation. What specific area would you like to explore?",
      role: "assistant",
      timestamp: new Date(),
      type: "text",
    }
  }

  const handleVoiceInput = (transcript: string) => {
    setVoiceTranscriptHistory((prev) => [transcript, ...prev].slice(0, 5))
    setInputValue(transcript)
    handleSendMessage(transcript)
  }

  const suggestionItems: SuggestionCardItem[] = [
    {
      id: "starter-campaign",
      title: "Launch promo campaign",
      description: "Build a short promotional sequence with hooks, CTA moments, and follow-up prompts.",
      actionLabel: "Create campaign prompt",
      icon: Sparkles,
      onAction: () => handleSendMessage("Create a short promo campaign workflow with 3 hooks and a follow-up sequence"),
    },
    {
      id: "voice-script",
      title: "Voice-first script",
      description: "Generate a conversational script optimized for live voice interactions.",
      actionLabel: "Generate voice script",
      icon: Mic,
      onAction: () => handleSendMessage("Generate a voice-friendly script for a live product walkthrough"),
    },
    {
      id: "inventory-automation",
      title: "Inventory automation",
      description: "Create reorder and low-stock automations for high-velocity SKUs.",
      actionLabel: "Draft automation plan",
      icon: Zap,
      onAction: () => handleSendMessage("Draft an inventory automation plan with reorder thresholds and alerts"),
    },
    {
      id: "prompt-improve",
      title: "Improve my prompt",
      description: "Rewrite a basic prompt into an outcome-focused RunAsh instruction set.",
      actionLabel: "Enhance prompt",
      icon: WandSparkles,
      onAction: () => setInputValue("Rewrite my prompt to include audience, offer, constraints, and CTA."),
    },
  ]

  const showEmptyState = messages.length === 1 && !inputValue.trim() && streamControllerState === "idle"

  const leftDrawer = (
    <div className="space-y-2">
      {sessionsStatus === "loading" ? (
        <ChatDataState
          state="loading"
          loadingMessage="Loading session history..."
          emptyMessage=""
          errorMessage=""
        />
      ) : null}
      {sessionsStatus === "error" ? (
        <ChatDataState
          state="error"
          loadingMessage=""
          emptyMessage=""
          errorMessage="Unable to sync session history. Showing local sessions."
        />
      ) : null}
      <ChatSidebar
        sessions={chatSessions}
        onSessionSelect={loadSession}
        currentSession={currentSession}
        onNewChat={handleNewChatSession}
        onDeleteSession={handleDeleteSession}
        streamId={queryStreamId}
        activeProjectName={queryProjectName ?? bootstrapProjectName ?? currentSession?.title ?? null}
        selectedLibraryItemTitle={queryLibraryItemTitle}
        onNavigateToWorkspaceTool={() => {
          if (!isDesktop) {
            setLeftDrawerOpen(false)
          }
        }}
      />
    </div>
  )

  const rightDrawer = (
    <div className="h-full space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      {quickActions.length === 0 ? (
        <ChatDataState state="empty" loadingMessage="" emptyMessage="Quick actions are unavailable right now." errorMessage="" />
      ) : null}
      <RunAshChatCommandCenter quickActions={quickActions} onSelectPrompt={handleSendMessage} />
    </div>
  )

  return (
    <ChatPageFrame>
      <div className="sticky top-0 z-50 mb-4 space-y-3">
        <ChatInfoBanner
          badge="New"
          message="Unified chat shell is now active with consistent actions and prompt patterns."
        />
        <ChatShellHeader
          title="RunAshChat"
          subtitle="AI Assistant"
          icon={<Bot className="h-5 w-5" />}
          actions={
            <>
              <CartDrawer />
              <ActionPill onClick={() => setShowPreferences(true)}>
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Preferences
              </ActionPill>
              <ActionPill onClick={() => setLeftDrawerOpen((prev) => !prev)} aria-pressed={leftDrawerOpen}>
                <History className="mr-1.5 h-3.5 w-3.5" />
                {leftDrawerOpen ? "Hide History" : "Show History"}
              </ActionPill>
              <ActionPill onClick={() => setRightDrawerOpen((prev) => !prev)} aria-pressed={rightDrawerOpen}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {rightDrawerOpen ? "Hide Tools" : "Show Tools"}
              </ActionPill>
              <ActionPill
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={voiceEnabled ? "bg-green-950 text-green-300" : ""}
                aria-pressed={voiceEnabled}
              >
                <Mic className="mr-1.5 h-3.5 w-3.5" />
                {voiceEnabled ? "Voice On" : "Voice Off"}
              </ActionPill>
              {streamControllerState === "sending" || streamControllerState === "streaming" ? (
                <ActionPill
                  onClick={stopStreamingResponse}
                  className="bg-red-950 text-red-200 hover:bg-red-900"
                  aria-label="Stop generating response"
                >
                  <OctagonX className="mr-1.5 h-3.5 w-3.5" />
                  Stop
                </ActionPill>
              ) : null}
            </>
          }
        />
      </div>

      <div className="flex gap-4">
        {isDesktop && leftDrawerOpen ? <div className="w-80 shrink-0">{leftDrawer}</div> : null}

        <div className="min-w-0 flex-1">
          {!isDesktop && leftDrawerOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                aria-label="Close session history"
                onClick={() => setLeftDrawerOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-3 lg:hidden">
                {leftDrawer}
              </aside>
            </>
          ) : null}

          {!isDesktop && rightDrawerOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                aria-label="Close utilities panel"
                onClick={() => setRightDrawerOpen(false)}
              />
              <aside className="fixed inset-y-0 right-0 z-50 w-[85vw] max-w-sm overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-3 lg:hidden">
                {rightDrawer}
              </aside>
            </>
          ) : null}

          <ChatSurfaceCard className="flex h-[calc(100vh-128px)] flex-col overflow-hidden">
            <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400 sm:px-4">
              <span>Shortcuts: Ctrl/Cmd+[ history • Ctrl/Cmd+] tools • Alt+←/→ toggle drawers.</span>
            </div>

            {showEmptyState ? (
              <div className="border-b border-zinc-800 p-3 sm:p-4">
                <SuggestionCardGrid
                  title="Prompt suggestions"
                  items={suggestionItems}
                  emptyMessage="No suggestions available right now."
                />
              </div>
            ) : null}

            <ScrollArea className="flex-1 p-3 sm:p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessageComponent key={message.id} message={message} sessionId={currentSession?.id} />
                ))}

                {(isTyping || streamControllerState === "sending" || streamControllerState === "streaming") && (
                  <div className="flex items-center space-x-2 text-zinc-400" aria-live="polite">
                    <div className="rounded-lg bg-zinc-900 p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {voiceEnabled && (
              <div className="border-t border-zinc-800 p-3 space-y-3 sm:p-4">
                {voiceTranscriptHistory.length > 0 && (
                  <div className="rounded-md border border-green-900/70 bg-green-950/20 p-2 text-xs">
                    <div className="mb-1 flex items-center font-medium text-green-300">
                      <Search className="mr-1 h-3 w-3" /> Recent voice intents
                    </div>
                    <ul className="space-y-1 text-zinc-300">
                      {voiceTranscriptHistory.map((item, index) => (
                        <li key={`${item}-${index}`} className="line-clamp-1">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <VoiceControls
                  onVoiceInput={handleVoiceInput}
                  isEnabled={voiceEnabled}
                  latestAssistantMessage={messages.filter((message) => message.role === "assistant").at(-1)?.content}
                />
              </div>
            )}

            <div className="border-t border-zinc-800 p-3 sm:p-4">
              <RunAshChatComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSendMessage}
                disabled={streamControllerState === "sending" || streamControllerState === "streaming" || streamControllerState === "stopping"}
                streamState={streamControllerState}
                composerHealth={composerHealth}
                onRetry={retryLastPrompt}
                onStop={stopStreamingResponse}
                tone={selectedTone}
                onToneChange={setSelectedTone}
                detailLevel={detailLevel}
                onDetailLevelChange={setDetailLevel}
                modelOptions={modelCatalog}
                selectedModel={selectedModel}
                onSelectedModelChange={setSelectedModel}
              />
              {(streamControllerState === "failed" || runDiagnostics.requestId || runDiagnostics.provider) && (
                <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/60 p-2 text-xs text-zinc-300">
                  <p className="font-medium text-zinc-100">Recent-run diagnostics</p>
                  <p>Request ID: {runDiagnostics.requestId || "n/a"}</p>
                  <p>Provider: {runDiagnostics.provider || "RunAsh AI"}</p>
                  <p>Model: {runDiagnostics.model || "n/a"}</p>
                  {runDiagnostics.lastErrorCode ? <p>Error code: {runDiagnostics.lastErrorCode}</p> : null}
                </div>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                <span>Prompt composer is optimized for RunAsh task templates and enhanced prompt quality.</span>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Leaf className="h-3 w-3 mr-1 text-green-500" />
                    Organic Focus
                  </span>
                  <span className="flex items-center">
                    <Sparkles className="h-3 w-3 mr-1 text-orange-500" />
                    RunAsh AI
                  </span>
                </div>
              </div>
            </div>
          </ChatSurfaceCard>
        </div>

        {isDesktop && rightDrawerOpen ? (
          <div className="hidden w-80 shrink-0 lg:block">{rightDrawer}</div>
        ) : null}
      </div>

      {/* User Preferences Dialog */}
      {showPreferences && (
        <UserPreferencesDialog
          preferences={userPreferences}
          onSave={setUserPreferences}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </ChatPageFrame>
  )
}
