"use client"

import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { Sparkles, Leaf, Settings, History, Bot, Mic, Search, OctagonX, MoreHorizontal, FileText, CreditCard, Megaphone, Workflow, ListChecks, Loader2 } from "lucide-react"
import type { ChatMessage, ChatSession, UserPreferences, QuickAction } from "@/types/runash-chat"
import ChatMessageComponent from "@/components/chat/chat-message"
import ChatSidebar from "@/components/chat/chat-sidebar"
import UserPreferencesDialog from "@/components/chat/user-preferences-dialog"
import CartDrawer from "@/components/cart/cart-drawer"
import VoiceControls from "@/components/chat/voice-controls"
import { RunAshChatComposer } from "@/components/chat/runash-chat-composer"
import type { ComposerAttachmentMetadata, ComposerAttachmentPreview } from "@/components/chat/runash-chat-composer"
import { RunAshChatCommandCenter } from "@/components/chat/runash-chat-command-center"
import {
  ActionPill,
  ChatDataState,
  ChatInfoBanner,
  ChatPageFrame,
  ChatShellHeader,
  SuggestionCardGrid,
  ChatSurfaceCard,
} from "@/components/chat/shared-chat-primitives"
import { useDashboardModelDialog } from "@/components/dashboard/model-dialog-provider"
import { buildRunAshChatQuickActions } from "@/lib/runash-chat/quick-actions"
import { resolveRequestedToolsForMessage } from "@/lib/runash-chat/tooling"
 
import { getRecommendedProducts, shouldRecommendProducts } from "@/lib/chat-product-recommendations"

const UPGRADE_METRICS_KEY = "runash_upgrade_metrics_v2"

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
  const [isTouchDevice, setIsTouchDevice] = useState(false)
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
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const sendAbortRef = useRef<AbortController | null>(null)
  const sessionHydrationRequestRef = useRef(0)
  const firstCompletionTrackedRef = useRef(false)
  const turnCompletionDedupRef = useRef<Set<string>>(new Set())

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
  const [sessionOpenState, setSessionOpenState] = useState<{
    status: "idle" | "loading" | "error"
    sessionId: string | null
    errorMessage: string | null
  }>({ status: "idle", sessionId: null, errorMessage: null })
  const [sessionListRetryToken, setSessionListRetryToken] = useState(0)

  const [attachmentPreview, setAttachmentPreview] = useState<ComposerAttachmentPreview | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [hasCompletedFirstMessage, setHasCompletedFirstMessage] = useState(false)
  const attachmentRetryRef = useRef<File | null>(null)

  const IMAGE_MAX_FILE_SIZE = 8 * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]


  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [persistedSessionIds, setPersistedSessionIds] = useState<string[]>([])

  const buildEmptySessionContext = () => ({
    preferences: {
      dietaryRestrictions: [],
      sustainabilityPriority: "medium" as const,
      budgetRange: [0, 100] as [number, number],
      preferredCategories: [],
      cookingSkillLevel: "intermediate" as const,
    },
    currentCart: [],
    recentSearches: [],
  })

  const mapSessionMessageToChatMessage = (message: {
    id?: string | number
    role?: string
    content?: string
    created_at?: string
    createdAt?: string
    status?: string
    message_type?: string
    messageType?: string
  }): ChatMessage | null => {
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      return null
    }

    return {
      id: String(message.id ?? `${Date.now()}-${Math.random()}`),
      role: message.role,
      content: message.content,
      timestamp: new Date(message.created_at ?? message.createdAt ?? Date.now()),
      status:
        message.status === "queued" ||
        message.status === "streaming" ||
        message.status === "tool-running" ||
        message.status === "completed" ||
        message.status === "failed"
          ? message.status
          : "completed",
      type:
        message.message_type === "product" ||
        message.message_type === "recipe" ||
        message.message_type === "tip" ||
        message.message_type === "automation" ||
        message.messageType === "product" ||
        message.messageType === "recipe" ||
        message.messageType === "tip" ||
        message.messageType === "automation"
          ? (message.message_type ?? message.messageType)
          : "text",
    }
  }

  const normalizeChatMessage = (message: ChatMessage): ChatMessage => ({
    ...message,
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
    type: message.type ?? "text",
    status: message.status ?? "completed",
  })

  const appendLocalMessage = (message: ChatMessage) => {
    const normalizedMessage = normalizeChatMessage(message)
    setMessages((prev) => [...prev, normalizedMessage])
    if (currentSession?.id) {
      pushMessageToSessionState(currentSession.id, normalizedMessage)
    }
    return normalizedMessage
  }

  const pushMessageToSessionState = (sessionId: string, message: ChatMessage) => {
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages.filter((entry) => entry.id !== message.id), message],
              updatedAt: message.timestamp,
            }
          : session,
      ),
    )
  }

  const fetchSessionMessages = async (sessionId: string) => {
    const response = await fetch(`/api/agents/sessions/${encodeURIComponent(sessionId)}?limit=100`, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Unable to hydrate session")
    }

    const payload = (await response.json()) as { data?: { messages?: Array<Record<string, unknown>> } }
    const rawMessages = Array.isArray(payload.data?.messages) ? payload.data.messages : []

    return rawMessages
      .map((entry) =>
        mapSessionMessageToChatMessage({
          id: typeof entry.id === "string" || typeof entry.id === "number" ? entry.id : undefined,
          role: typeof entry.role === "string" ? entry.role : undefined,
          content: typeof entry.content === "string" ? entry.content : undefined,
          created_at: typeof entry.created_at === "string" ? entry.created_at : undefined,
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : undefined,
          status: typeof entry.status === "string" ? entry.status : undefined,
          message_type: typeof entry.message_type === "string" ? entry.message_type : undefined,
          messageType: typeof entry.messageType === "string" ? entry.messageType : undefined,
        }),
      )
      .filter((message): message is ChatMessage => message !== null)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  const ensureActiveSession = async (titleSeed: string) => {
    if (currentSession) {
      return currentSession
    }

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleSeed.trim().slice(0, 80) || "RunAsh Agent Session" }),
    })

    if (!response.ok) {
      throw new Error("Unable to create chat session")
    }

    const payload = (await response.json()) as { data?: { id?: string | number; title?: string; created_at?: string } }
    const newSession: ChatSession = {
      id: String(payload.data?.id ?? `session-${Date.now()}`),
      title: payload.data?.title ?? (titleSeed.trim().slice(0, 80) || "RunAsh Agent Session"),
      messages: [],
      createdAt: new Date(payload.data?.created_at ?? Date.now()),
      updatedAt: new Date(payload.data?.created_at ?? Date.now()),
      context: buildEmptySessionContext(),
    }

    setCurrentSession(newSession)
    setChatSessions((prev) => [newSession, ...prev.filter((session) => session.id !== newSession.id)])
    if (payload.data?.id !== undefined && payload.data?.id !== null) {
      setPersistedSessionIds((prev) => (prev.includes(newSession.id) ? prev : [newSession.id, ...prev]))
    }
    return newSession
  }

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

  const scrollMessagesToBottom = (behavior: ScrollBehavior = "auto") => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior })
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollMessagesToBottom(streamControllerState === "streaming" ? "auto" : "smooth")
  }, [messages, streamControllerState])

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
    if (typeof window === "undefined") return

    const pointerQuery = window.matchMedia("(pointer: coarse)")
    const syncViewport = () => {
      setIsDesktop(window.innerWidth >= 1024)
      setIsTouchDevice(pointerQuery.matches)
    }

    syncViewport()
    window.addEventListener("resize", syncViewport)

    if (typeof pointerQuery.addEventListener === "function") {
      pointerQuery.addEventListener("change", syncViewport)
    } else {
      pointerQuery.addListener(syncViewport)
    }

    return () => {
      window.removeEventListener("resize", syncViewport)
      if (typeof pointerQuery.removeEventListener === "function") {
        pointerQuery.removeEventListener("change", syncViewport)
      } else {
        pointerQuery.removeListener(syncViewport)
      }
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
    if (!isDesktop && leftDrawerOpen && rightDrawerOpen) {
      setRightDrawerOpen(false)
    }
  }, [isDesktop, leftDrawerOpen, rightDrawerOpen])

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
        const response = await fetch("/api/sessions", { cache: "no-store" })
        if (!response.ok) throw new Error("Unable to load sessions")
        const payload = await response.json()
        const listed = Array.isArray(payload?.data) ? payload.data : []
        if (listed.length === 0) {
          setPersistedSessionIds([])
          setSessionsStatus("ready")
          return
        }

        setPersistedSessionIds(listed.map((entry: { id: string }) => String(entry.id)))

        setChatSessions((previous) => {
          const mapped = listed.map((entry: { id: string; title?: string; created_at?: string }) => ({
            id: String(entry.id),
            title: entry.title ?? "Session",
            messages: previous.find((session) => session.id === String(entry.id))?.messages ?? [],
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
      }
    })()
  }, [sessionListRetryToken])

  const loadSession = async (session: ChatSession) => {
    const requestId = sessionHydrationRequestRef.current + 1
    sessionHydrationRequestRef.current = requestId
    setCurrentSession(session)
    setSessionOpenState({ status: "loading", sessionId: session.id, errorMessage: null })

    try {
      const hydratedMessages = (await fetchSessionMessages(session.id)).map(normalizeChatMessage)
      if (sessionHydrationRequestRef.current !== requestId) return
      const nextMessages = hydratedMessages.length > 0 ? hydratedMessages : [defaultAssistantMessage]

      setMessages(nextMessages)
      setChatSessions((prev) =>
        prev.map((item) =>
          item.id === session.id
            ? {
                ...item,
                messages: hydratedMessages,
                updatedAt: hydratedMessages.at(-1)?.timestamp ?? item.updatedAt,
              }
            : item,
        ),
      )
      setSessionOpenState({ status: "idle", sessionId: null, errorMessage: null })
    } catch {
      if (sessionHydrationRequestRef.current !== requestId) return
      setSessionOpenState({
        status: "error",
        sessionId: session.id,
        errorMessage: "Could not load this chat. Please retry.",
      })
    }
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
    setPersistedSessionIds((prev) => prev.filter((id) => id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([defaultAssistantMessage])
    }
  }

  useEffect(() => {
    if (!querySessionId) return

    const matchedSession = chatSessions.find((session) => session.id === querySessionId)
    if (!matchedSession) return

    void loadSession(matchedSession)
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

      appendLocalMessage(userMessage)
      setIsTyping(true)

      try {
        await ensureActiveSession(message)

        const response = await fetch(`/api/web-search?query=${encodeURIComponent(message)}`)
        const payload = await response.json()
        const searchResults = Array.isArray(payload?.data?.results) ? payload.data.results : []
        const searchSummary: ChatMessage = {
          id: `${Date.now()}-search-assistant`,
          content: "Here are top product search results from EXA/MCP-compatible providers.",
          role: "assistant",
          timestamp: new Date(),
          type: "text",
          status: "completed",
          metadata: { searchResults },
        }

        appendLocalMessage(searchSummary)

      } catch {
        const unavailableMessage: ChatMessage = {
          id: `${Date.now()}-search-error`,
          content: "Web search is unavailable right now. Please try again in a moment.",
          role: "assistant",
          timestamp: new Date(),
          type: "text",
          status: "failed",
        }

        appendLocalMessage(unavailableMessage)
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

    if (attachmentPreview?.uploadState === "failed") {
      setAttachmentError("Fix the image upload issue before sending.")
      return
    }

    if (attachmentPreview?.uploadState === "uploading") {
      setAttachmentError("Please wait for the image upload to finish.")
      return
    }

    const queuedAttachment = attachmentPreview?.uploadState === "uploaded" ? attachmentPreview.metadata : null

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
      type: "text",
      status: "completed",
      metadata: queuedAttachment ? { attachments: [queuedAttachment] } : undefined,
    }

    const assistantId = `${Date.now()}-assistant`
    const clientRequestId = `chat-turn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    let activeSessionId: string | null = null
    let activeSessionTitle: string | null = null
    const assistantMessage: ChatMessage = {
      id: assistantId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      type: "text",
      status: "queued",
    }

    appendLocalMessage(userMessage)
    appendLocalMessage(assistantMessage)
    setInputValue("")
    setIsTyping(true)
    setStreamControllerState("sending")
    setComposerHealth("ready")
    setLastPromptForRetry(content)
    setRunDiagnostics({ requestId: null, provider: "RunAsh AI", model: null, lastErrorCode: null })
    const attachmentMetadata = queuedAttachment ? [queuedAttachment] : undefined
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview.previewUrl)
      setAttachmentPreview(null)
      setAttachmentError(null)
    }

    const abortController = new AbortController()
    sendAbortRef.current = abortController
    const timeoutId = window.setTimeout(() => {
      abortController.abort("timeout")
    }, 45000)

    try {
      const activeSession = await ensureActiveSession(content)
      activeSessionId = activeSession.id
      activeSessionTitle = activeSession.title

      const requestedTools = resolveRequestedToolsForMessage(content)
      const normalizedContent = applyComposerModifiers(content)

      const toolPayloads = undefined

      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          sessionId: activeSessionId ?? undefined,
          title: activeSessionTitle ?? "RunAsh Agent Session",
          message: normalizedContent,
          model: selectedModel,
          provider: modelCatalog.find((entry) => entry.id === selectedModel)?.provider,
          tools: requestedTools,
          toolPayloads,
          attachments: attachmentMetadata,
          clientRequestId,
        }),
      })

      setRunDiagnostics((previous) => ({
        ...previous,
        requestId: response.headers.get("x-request-id") || previous.requestId,
        provider: response.headers.get("x-provider") || previous.provider || "RunAsh AI",
      }))

      const responseContentType = response.headers.get("content-type") ?? ""
      if (response.ok && responseContentType.includes("application/json")) {
        const payload = (await response.json()) as { deduped?: boolean; sessionId?: string; messageId?: string; content?: string; requestId?: string }
        if (payload.deduped) {
          const dedupeKey = payload.sessionId && payload.requestId ? `${payload.sessionId}:${payload.requestId}` : payload.messageId
          if (dedupeKey && turnCompletionDedupRef.current.has(dedupeKey)) {
            setStreamControllerState("idle")
            return
          }
          if (dedupeKey) {
            turnCompletionDedupRef.current.add(dedupeKey)
          }
          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === assistantId
                ? {
                    ...entry,
                    id: payload.messageId ?? entry.id,
                    content: payload.content ?? entry.content,
                    status: "completed",
                  }
                : entry,
            ),
          )
          setStreamControllerState("idle")
          return
        }
      }

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
            const finalSessionId = typeof payload.sessionId === "string" ? payload.sessionId : activeSessionId
            const finalRequestId = typeof payload.requestId === "string" ? payload.requestId : payloadRequestId
            const finalMessageId = typeof payload.messageId === "string" ? payload.messageId : null
            const dedupeKey = finalSessionId && finalRequestId ? `${finalSessionId}:${finalRequestId}` : finalMessageId

            if (dedupeKey && turnCompletionDedupRef.current.has(dedupeKey)) {
              continue
            }

            updateAssistantMessage((existing) => ({
              ...existing,
              id: finalMessageId ?? existing.id,
              status: payload.status === "completed" ? "completed" : existing.status,
              content: typeof payload.content === "string" && payload.content.length > 0 ? payload.content : existing.content,
            }))

            if (dedupeKey) {
              turnCompletionDedupRef.current.add(dedupeKey)
            }

            if (payload.status === "completed") {
              setHasCompletedFirstMessage(true)
              if (!firstCompletionTrackedRef.current) {
                firstCompletionTrackedRef.current = true
                trackUpgradeMetric("first_message_completed", "deferred_upgrade_prompt")
              }
            }
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

  const processImageAttachment = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAttachmentError("Unsupported file type. Please upload PNG, JPG, WEBP, or GIF.")
      return
    }

    if (file.size > IMAGE_MAX_FILE_SIZE) {
      setAttachmentError("Image is too large. Please upload a file up to 8 MB.")
      return
    }

    attachmentRetryRef.current = file
    setAttachmentError(null)

    const previewUrl = URL.createObjectURL(file)
    setAttachmentPreview((existing) => {
      if (existing) URL.revokeObjectURL(existing.previewUrl)
      return {
        metadata: { name: file.name, size: file.size, type: file.type },
        previewUrl,
        uploadState: "uploading",
      }
    })

    const metadataResult = await new Promise<ComposerAttachmentMetadata>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      }
      image.onerror = () => reject(new Error("image_preview_failed"))
      image.src = previewUrl
    }).catch(() => null)

    if (!metadataResult) {
      setAttachmentPreview((existing) =>
        existing
          ? {
              ...existing,
              uploadState: "failed",
              error: "Preview generation failed. Try a different image or retry.",
            }
          : null,
      )
      return
    }

    setAttachmentPreview((existing) =>
      existing
        ? {
            ...existing,
            metadata: metadataResult,
            uploadState: "uploaded",
            error: undefined,
          }
        : null,
    )
  }

  const retryAttachment = () => {
    if (!attachmentRetryRef.current) return
    void processImageAttachment(attachmentRetryRef.current)
  }

  const removeAttachment = () => {
    setAttachmentPreview((existing) => {
      if (existing) URL.revokeObjectURL(existing.previewUrl)
      return null
    })
    attachmentRetryRef.current = null
    setAttachmentError(null)
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

  const starterPromptCards = [
    {
      id: "campaign-brief",
      title: "Create campaign brief",
      description: "Define goals, audience, channels, and KPIs for a launch.",
      actionLabel: "Draft brief",
      icon: Megaphone,
      prompt: "Create a campaign brief for a new sustainable skincare launch with goals, audience, channels, and KPIs.",
    },
    {
      id: "product-description",
      title: "Write product description",
      description: "Generate benefits-first copy with ingredients and CTA.",
      actionLabel: "Generate copy",
      icon: FileText,
      prompt: "Write a product description for an organic snack bundle with key benefits, ingredients, and CTA.",
    },
    {
      id: "summarize-meeting",
      title: "Summarize meeting",
      description: "Extract decisions, next steps, owners, and due dates.",
      actionLabel: "Summarize notes",
      icon: ListChecks,
      prompt: "Summarize this meeting into decisions, action items, owners, and due dates.",
    },
    {
      id: "automation-plan",
      title: "Plan an automation",
      description: "Map triggers, approvals, and reporting for your workflow.",
      actionLabel: "Build workflow",
      icon: Workflow,
      prompt: "Draft an automation workflow for inventory alerts, reorder approvals, and weekly reporting.",
    },
    {
      id: "social-posts",
      title: "Generate social posts",
      description: "Create campaign-ready post ideas in your brand voice.",
      actionLabel: "Create posts",
      icon: Sparkles,
      prompt: "Generate 5 social post ideas for an eco-friendly product campaign in a friendly brand tone.",
    },
  ]

  const hasUserMessage = messages.some((message) => message.role === "user")
  const showComposerEmptyState = !hasUserMessage && streamControllerState === "idle"


  const trackUpgradeMetric = (eventName: "upgrade_click" | "first_message_completed", location: string) => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(UPGRADE_METRICS_KEY)
      const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      const key = `${eventName}:${location}`
      parsed[key] = (parsed[key] ?? 0) + 1
      window.localStorage.setItem(UPGRADE_METRICS_KEY, JSON.stringify(parsed))
    } catch {
      return
    }
  }

  const handleUpgradeClick = (location: "composer_inline" | "header_account") => {
    trackUpgradeMetric("upgrade_click", location)
  }

  const retrySessionOpen = () => {
    if (!sessionOpenState.sessionId) return
    const target = chatSessions.find((session) => session.id === sessionOpenState.sessionId)
    if (!target) return
    void loadSession(target)
  }
  const retrySessionList = () => {
    setSessionListRetryToken((prev) => prev + 1)
  }
  const persistedSessions = useMemo(() => chatSessions.filter((session) => persistedSessionIds.includes(session.id)), [chatSessions, persistedSessionIds])
  const recentSession = currentSession ?? persistedSessions.at(0) ?? null

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
        <div className="space-y-2">
          <ChatDataState
            state="error"
            loadingMessage=""
            emptyMessage=""
            errorMessage="Unable to sync session history. Please retry in a moment."
          />
          <Button size="sm" variant="outline" onClick={retrySessionList}>
            Retry history sync
          </Button>
        </div>
      ) : null}
      <ChatSidebar
        sessions={chatSessions}
        onSessionSelect={loadSession}
        currentSession={currentSession}
        onNewChat={handleNewChatSession}
        onSuggestedPrompts={handleNewChatSession}
        onImportContext={() => {
          window.location.href = "/dashboard/library"
        }}
        onDeleteSession={handleDeleteSession}
        persistedSessionIds={persistedSessionIds}
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
      <div className="flex min-h-[100dvh] min-h-0 flex-1 flex-col">
        <div className="sticky top-0 z-50 mb-3 space-y-2.5 sm:mb-4 sm:space-y-3">
          <ChatInfoBanner
            badge="New"
            message="Unified chat shell is now active with consistent actions and prompt patterns."
          />
          <ChatShellHeader
            title="RunAshChat"
            subtitle="AI Assistant"
            icon={<Bot className="h-5 w-5" />}
            primaryAction={
              <ActionPill onClick={handleNewChatSession} className="h-8 gap-1.5 px-3" aria-label="Start a new chat">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New chat</span>
                <span className="sm:sr-only">New chat</span>
              </ActionPill>
            }
            secondaryActions={
              <>
                <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
                  <ActionPill
                    onClick={() => setLeftDrawerOpen((prev) => !prev)}
                    aria-pressed={leftDrawerOpen}
                    aria-label={leftDrawerOpen ? "Hide history" : "Show history"}
                    className="h-8 w-8 px-0"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="sr-only">{leftDrawerOpen ? "Hide history" : "Show history"}</span>
                  </ActionPill>
                  <Sheet>
                    <SheetTrigger asChild>
                      <ActionPill aria-label="More" className="h-8 gap-1.5 px-2.5">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                        <span className="text-xs">More</span>
                      </ActionPill>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[88vw] max-w-sm border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SheetHeader>
                        <SheetTitle className="text-zinc-100">More</SheetTitle>
                        <SheetDescription className="text-zinc-400">
                          Preferences, tools, and cart controls.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Utilities</p>
                          <div className="flex flex-wrap gap-2">
                            <ActionPill onClick={() => setShowPreferences(true)} className="h-8 gap-1.5 px-3">
                              <Settings className="h-3.5 w-3.5" />
                              Preferences
                            </ActionPill>
                            <ActionPill asChild className="h-8 gap-1.5 px-3">
                              <a href="/upgrade" onClick={() => handleUpgradeClick("header_account")}>
                                <CreditCard className="h-3.5 w-3.5" />
                                Upgrade
                              </a>
                            </ActionPill>
                            <ActionPill
                              onClick={() => setVoiceEnabled(!voiceEnabled)}
                              className={voiceEnabled ? "h-8 gap-1.5 bg-green-950 px-3 text-green-300" : "h-8 gap-1.5 px-3"}
                              aria-pressed={voiceEnabled}
                              aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
                            >
                              <Mic className="h-3.5 w-3.5" />
                              {voiceEnabled ? "Voice On" : "Voice Off"}
                            </ActionPill>
                            <ActionPill
                              onClick={() => setRightDrawerOpen((prev) => !prev)}
                              aria-pressed={rightDrawerOpen}
                              aria-label={rightDrawerOpen ? "Hide tools" : "Show tools"}
                              className="h-8 gap-1.5 px-3"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {rightDrawerOpen ? "Hide tools" : "Show tools"}
                            </ActionPill>
                            <CartDrawer />
                          </div>
                        </div>
                        {streamControllerState === "sending" || streamControllerState === "streaming" ? (
                          <SheetClose asChild>
                            <ActionPill
                              onClick={stopStreamingResponse}
                              className="h-8 w-full justify-center bg-red-950 text-red-200 hover:bg-red-900"
                              aria-label="Stop generating response"
                            >
                              <OctagonX className="mr-1.5 h-3.5 w-3.5" />
                              Stop generation
                            </ActionPill>
                          </SheetClose>
                        ) : null}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="hidden items-center gap-2 lg:flex">
                  <CartDrawer />
                  <ActionPill onClick={() => setShowPreferences(true)}>
                    <Settings className="mr-1.5 h-3.5 w-3.5" />
                    Preferences
                  </ActionPill>
                  <ActionPill asChild>
                    <a href="/upgrade" onClick={() => handleUpgradeClick("header_account")}>
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      Upgrade
                    </a>
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
                    aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
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
                </div>
              </>
            }
          />
        </div>

      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
        {isDesktop && leftDrawerOpen ? <div className="w-80 shrink-0">{leftDrawer}</div> : null}

        <div className="min-h-0 min-w-0 flex-1 lg:max-w-5xl xl:max-w-6xl">
          {!isDesktop && leftDrawerOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-40 bg-black/60 lg:hidden"
                aria-label="Close session history"
                onClick={() => setLeftDrawerOpen(false)}
              />
              <aside className="fixed left-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-50 w-[92vw] max-w-sm overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:w-[85vw] lg:hidden">
                {leftDrawer}
              </aside>
            </>
          ) : null}

          {!isDesktop && rightDrawerOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-40 bg-black/60 lg:hidden"
                aria-label="Close utilities panel"
                onClick={() => setRightDrawerOpen(false)}
              />
              <aside className="fixed right-0 top-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-50 w-[92vw] max-w-sm overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:w-[85vw] lg:hidden">
                {rightDrawer}
              </aside>
            </>
          ) : null}


          <ChatSurfaceCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!isTouchDevice ? (
              <div className="hidden border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400 lg:block sm:px-4">
                <span>Shortcuts: Ctrl/Cmd+[ history • Ctrl/Cmd+] tools • Alt+←/→ toggle drawers.</span>
              </div>
            ) : null}


            <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1 p-3 sm:p-4">
              <div className="space-y-4">
                {sessionOpenState.status === "loading" ? (
                  <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-zinc-300" aria-live="polite">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading conversation…
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                    </div>
                  </div>
                ) : sessionOpenState.status === "error" ? (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-100">
                    <p>{sessionOpenState.errorMessage ?? "Unable to open this chat."}</p>
                    <Button type="button" size="sm" variant="outline" className="mt-3" onClick={retrySessionOpen}>
                      Retry opening chat
                    </Button>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessageComponent
                      key={message.id}
                      message={message}
                      sessionId={currentSession?.id}
                      onEditRequest={(messageId, nextContent) => {
                        setMessages((prev) => prev.map((entry) => (entry.id === messageId ? { ...entry, content: nextContent } : entry)))
                      }}
                      onRegenerate={(messageId) => {
                        const currentIndex = messages.findIndex((item) => item.id === messageId)
                        const sourcePrompt =
                          currentIndex > 0
                            ? [...messages.slice(0, currentIndex)].reverse().find((item) => item.role === "user")?.content
                            : messages.filter((item) => item.role === "user").at(-1)?.content
                        if (!sourcePrompt) return
                        void handleSendMessage(sourcePrompt)
                      }}
                    />
                  ))
                )}

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

            {showComposerEmptyState ? (
              <div className="border-t border-zinc-800 p-2.5 sm:p-3">
                <div className="space-y-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5 sm:space-y-3 sm:p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-100">What do you want to create?</p>
                    <p className="text-xs text-zinc-400">
                      Create faster content, automate repeat work, and summarize complex tasks in seconds.
                    </p>
                  </div>

                  <SuggestionCardGrid
                    title="Starter prompts"
                    items={starterPromptCards.map((item) => ({
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      actionLabel: item.actionLabel,
                      icon: item.icon,
                      onAction: () => handleSendMessage(item.prompt),
                    }))}
                    emptyMessage="Starter prompts are unavailable right now."
                  />

                  <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Recent project/session</p>
                    {recentSession ? (
                      <button
                        type="button"
                        onClick={() => loadSession(recentSession)}
                        className="mt-1.5 w-full rounded-md border border-transparent px-2 py-1.5 text-left text-xs text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800/80"
                      >
                        <span className="block font-medium text-zinc-100">{recentSession.title}</span>
                        <span className="block text-zinc-400">Continue where you left off.</span>
                      </button>
                    ) : (
                      <div className="mt-1.5 space-y-2">
                        <p className="text-xs text-zinc-400">No saved sessions yet. Start a new chat or use a suggested starter.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={handleNewChatSession}>
                            New chat
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-zinc-300 hover:text-zinc-100"
                            onClick={() => handleSendMessage(starterPromptCards[0]?.prompt ?? "")}
                          >
                            Suggested starter
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}


            <div className="sticky bottom-0 border-t border-zinc-800 bg-[#050607]/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-[#050607]/90 sm:p-4 sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]">

              <RunAshChatComposer
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSendMessage}
                disabled={streamControllerState === "sending" || streamControllerState === "streaming" || streamControllerState === "stopping" || sessionOpenState.status === "loading"}
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
                onAttachFile={processImageAttachment}
                attachmentPreview={attachmentPreview}
                attachmentError={attachmentError}
                onRetryAttachment={retryAttachment}
                onRemoveAttachment={removeAttachment}
                showUpgradePrompt={hasCompletedFirstMessage}
                onUpgradeClick={handleUpgradeClick}
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
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
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
