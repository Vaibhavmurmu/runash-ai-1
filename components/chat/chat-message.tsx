"use client"

import { memo, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Share, Pencil, Trash2, Loader2, Check, AlertCircle, RefreshCw, Wrench, ChevronDown, ChevronRight, Clock3, TriangleAlert } from "lucide-react"

import type { ChatMessage, ToolExecutionSummary, ToolStreamEvent } from "@/types/runash-chat"

import AutomationSuggestion from "./automation-suggestion"
import LinkQuickPayButton from "./link-quick-pay-button"
import ProductCard from "./product-card"
import RecipeCard from "./recipe-card"
import SearchResults from "./search-results"
import SustainabilityTip from "./sustainability-tip"

interface ChatMessageProps {
  message: ChatMessage
  sessionId?: string
  onEditRequest?: (messageId: string, nextContent: string) => void
  onRegenerate?: (messageId: string) => void
}

type MessageActionState = {
  copied: boolean
  feedback: "up" | "down" | null
  feedbackStatus: "idle" | "pending" | "failed"
  editStatus: "idle" | "pending" | "failed"
  deleteStatus: "idle" | "pending" | "failed"
  shareStatus: "idle" | "pending" | "failed"
}

const supportsWebShare = typeof navigator !== "undefined" && "share" in navigator

function ChatMessageComponent({ message, sessionId, onEditRequest, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [isDeletedLocally, setIsDeletedLocally] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [displayedContent, setDisplayedContent] = useState(message.content)
  const [draftContent, setDraftContent] = useState(message.content)
  const [state, setState] = useState<MessageActionState>({
    copied: false,
    feedback: null,
    feedbackStatus: "idle",
    editStatus: "idle",
    deleteStatus: "idle",
    shareStatus: "idle",
  })
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

  const capabilities = useMemo(
    () => ({
      canCopy: true,
      canReact: true,
      canShare: true,
      canEdit: Boolean(sessionId),
      canDelete: Boolean(sessionId),
      canMutate: Boolean(sessionId),
      canRegenerate: !isUser,
    }),
    [isUser, sessionId],
  )

  useEffect(() => {
    setDisplayedContent(message.content)
    if (!isEditing) {
      setDraftContent(message.content)
    }
  }, [isEditing, message.content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayedContent)
      setState((current) => ({ ...current, copied: true }))
      window.setTimeout(() => {
        setState((current) => ({ ...current, copied: false }))
      }, 1200)
    } catch {
      setState((current) => ({ ...current, copied: false }))
    }
  }

  const handleFeedback = async (type: "up" | "down") => {
    setState((current) => ({ ...current, feedback: type, feedbackStatus: "pending" }))

    try {
      const response = await fetch("/api/agents/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "chat-ui",
          messageId: message.id,
          signal: type === "up" ? "quality" : "safety",
          score: type === "up" ? 5 : 2,
          reason: type === "up" ? "helpful" : "needs-improvement",
        }),
      })

      if (!response.ok) {
        throw new Error("feedback_failed")
      }

      setState((current) => ({ ...current, feedbackStatus: "idle" }))
    } catch {
      setState((current) => ({ ...current, feedbackStatus: "failed" }))
    }
  }

  const handleShare = async () => {
    setState((current) => ({ ...current, shareStatus: "pending" }))
    try {
      if (supportsWebShare) {
        await navigator.share({
          title: "RunAsh chat message",
          text: message.content,
        })
      } else {
        await navigator.clipboard.writeText(displayedContent)
      }

      setState((current) => ({ ...current, shareStatus: "idle", copied: !supportsWebShare }))
    } catch {
      setState((current) => ({ ...current, shareStatus: "failed" }))
    }
  }

  const handleEdit = async () => {
    if (!capabilities.canMutate || !sessionId) {
      setIsEditing((open) => !open)
      return
    }

    const nextContent = draftContent.trim()
    if (!nextContent) {
      setState((current) => ({ ...current, editStatus: "failed" }))
      return
    }

    setState((current) => ({ ...current, editStatus: "pending" }))

    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content: nextContent }),
      })

      if (!response.ok) {
        throw new Error("edit_failed")
      }

      setDisplayedContent(nextContent)
      onEditRequest?.(message.id, nextContent)
      setState((current) => ({ ...current, editStatus: "idle" }))
      setIsEditing(false)
    } catch {
      setState((current) => ({ ...current, editStatus: "failed" }))
    }
  }

  const handleDelete = async () => {
    if (!capabilities.canMutate || !sessionId) {
      setIsDeletedLocally(true)
      return
    }

    setState((current) => ({ ...current, deleteStatus: "pending" }))

    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        throw new Error("delete_failed")
      }

      setState((current) => ({ ...current, deleteStatus: "idle" }))
      setIsDeletedLocally(true)
    } catch {
      setState((current) => ({ ...current, deleteStatus: "failed" }))
    }
  }

  const statusLabel =
    message.status === "streaming"
      ? "Generating response"
      : message.status === "queued"
        ? "Queued for processing"
        : message.status === "tool-running"
          ? "Running tools"
          : message.status === "failed"
            ? "Generation failed"
            : "Response ready"

  const canRegenerateNow = capabilities.canRegenerate && message.status !== "streaming" && message.status !== "tool-running"

  const toolExecutions = message.metadata?.toolExecutions ?? []
  const toolEvents = message.metadata?.toolEvents ?? []

  const formatToolLabel = (tool: string) =>
    tool
      .split("_")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ")

  const formatDuration = (durationMs?: number) => {
    if (typeof durationMs !== "number" || Number.isNaN(durationMs) || durationMs < 0) return null
    if (durationMs < 1000) return `${durationMs}ms`
    return `${(durationMs / 1000).toFixed(1)}s`
  }

  const toggleToolExpansion = (id: string) => {
    setExpandedTools((current) => ({ ...current, [id]: !current[id] }))
  }

  const renderToolStatusChip = (tool: ToolExecutionSummary) => {
    const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
    if (tool.status === "running") {
      return <span className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-300`}><Loader2 className="h-2.5 w-2.5 animate-spin" />Running</span>
    }
    if (tool.status === "failed") {
      return <span className={`${base} border-rose-500/40 bg-rose-500/10 text-rose-300`}><TriangleAlert className="h-2.5 w-2.5" />Failed</span>
    }
    return <span className={`${base} border-zinc-600 bg-zinc-800/80 text-zinc-200`}><Check className="h-2.5 w-2.5" />Done</span>
  }


  const renderToolEventBadge = (event: ToolStreamEvent) => {
    const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
    if (event.type === "tool_error") {
      return <span className={`${base} border-rose-500/40 bg-rose-500/10 text-rose-300`}><TriangleAlert className="h-2.5 w-2.5" />Failed</span>
    }
    if (event.type === "tool_result") {
      return <span className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-300`}><Check className="h-2.5 w-2.5" />Success</span>
    }
    return <span className={`${base} border-zinc-600 bg-zinc-800/80 text-zinc-200`}><Loader2 className="h-2.5 w-2.5 animate-spin" />Started</span>
  }
  const toolResultSections = [
    { key: "products", label: "Products", content: message.metadata?.products },
    { key: "recipes", label: "Recipes", content: message.metadata?.recipes },
    { key: "tips", label: "Sustainability tips", content: message.metadata?.tips },
    { key: "automation", label: "Automation suggestions", content: message.metadata?.automationSuggestions },
    { key: "search", label: "Search results", content: message.metadata?.searchResults },
    { key: "payment", label: "Checkout", content: message.metadata?.linkQuickPay },
  ].filter((section) => Boolean(section.content))

  const hasToolResults = !isUser && toolResultSections.length > 0

  if (isDeletedLocally) {
    return null
  }

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] items-start ${isUser ? "flex-row-reverse" : "flex-row"} gap-3`}>
        <div
          className={`rounded-full p-2 ${
            isUser ? "bg-gradient-to-r from-orange-600 to-yellow-500" : "bg-gradient-to-r from-green-600 to-emerald-500"
          }`}
        >
          {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
        </div>

        <div className={`min-w-0 flex-1 ${isUser ? "text-right" : "text-left"}`}>
          <div
            className={`rounded-lg border p-3 ${
              isUser ? "border-orange-500/40 bg-gradient-to-r from-orange-600 to-yellow-500 text-white" : "border-zinc-700 bg-zinc-900 text-zinc-100"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide">
              <span className={isUser ? "text-white/80" : "text-zinc-400"}>{statusLabel}</span>
              {!isUser && (message.status === "streaming" || message.status === "tool-running") ? (
                <span className="inline-flex items-center text-emerald-300" role="status" aria-live="polite">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Live update
                </span>
              ) : null}
            </div>
            {!isUser && toolExecutions.length > 0 ? (
              <div className="mb-2 space-y-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
                {toolExecutions.map((tool) => {
                  const isExpanded = Boolean(expandedTools[tool.id])
                  const durationLabel = formatDuration(tool.durationMs)
                  const timingLabel = tool.status === "running" ? "In progress" : durationLabel

                  return (
                    <div key={tool.id} className="rounded border border-zinc-800/80 bg-zinc-900/70">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
                        onClick={() => toggleToolExpansion(tool.id)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-200">
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-400" /> : <ChevronRight className="h-3 w-3 text-zinc-400" />}
                            <span className="truncate font-medium">{formatToolLabel(tool.tool)}</span>
                            {renderToolStatusChip(tool)}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                            {tool.progressLabel ? <span>{tool.progressLabel}</span> : null}
                            {timingLabel ? <span className="inline-flex items-center gap-1"><Clock3 className="h-2.5 w-2.5" />{timingLabel}</span> : null}
                          </div>
                        </div>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-300">
                          {tool.errorMessage ? <p className="mb-1 text-rose-300">{tool.errorMessage}</p> : null}
                          {tool.outputPreview ? <p className="line-clamp-3 whitespace-pre-wrap break-all">{tool.outputPreview}</p> : <p className="text-zinc-500">No output captured.</p>}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {!isUser && toolEvents.length > 0 ? (
              <div className="mb-2 space-y-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">Tool timeline</div>
                {toolEvents.map((event, index) => {
                  const eventId = `${event.executionId}-${event.type}-${index}`
                  const isExpanded = Boolean(expandedTools[eventId])
                  return (
                    <div key={eventId} className="rounded border border-zinc-800/80 bg-zinc-900/70">
                      <button type="button" className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left" onClick={() => toggleToolExpansion(eventId)}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-200">
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-400" /> : <ChevronRight className="h-3 w-3 text-zinc-400" />}
                            <span className="truncate font-medium">{formatToolLabel(event.tool)}</span>
                            {renderToolEventBadge(event)}
                          </div>
                        </div>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-300">
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(event, null, 2)}</pre>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {isEditing ? (
              <textarea
                aria-label="Edit chat message"
                className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-100"
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
              />
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{displayedContent}</p>
            )}
          </div>

          {hasToolResults ? (
            <div className="mt-3 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
                <Wrench className="h-3.5 w-3.5" /> Tool results
              </div>

              {message.metadata?.products ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Products</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {message.metadata.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              ) : null}

              {message.metadata?.recipes ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Recipes</p>
                  <div className="space-y-3">
                    {message.metadata.recipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </section>
              ) : null}

              {message.metadata?.tips ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Sustainability tips</p>
                  <div className="space-y-3">
                    {message.metadata.tips.map((tip) => (
                      <SustainabilityTip key={tip.id} tip={tip} />
                    ))}
                  </div>
                </section>
              ) : null}

              {message.metadata?.automationSuggestions ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Automation suggestions</p>
                  <div className="space-y-3">
                    {message.metadata.automationSuggestions.map((suggestion) => (
                      <AutomationSuggestion key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                </section>
              ) : null}

              {message.metadata?.searchResults && message.metadata.searchResults.length > 0 ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Search results</p>
                  <SearchResults results={message.metadata.searchResults} />
                </section>
              ) : null}

              {message.metadata?.linkQuickPay ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Checkout</p>
                  <LinkQuickPayButton
                    last4={message.metadata.linkQuickPay.last4}
                    eligibleForLink={message.metadata.linkQuickPay.eligibleForLink}
                    taxPreview={message.metadata.linkQuickPay.taxPreview}
                    isDigitalProduct={message.metadata.linkQuickPay.tags.includes("digital")}
                    itemName={message.metadata.linkQuickPay.itemName}
                    amountLabel={`${message.metadata.linkQuickPay.currency} ${(message.metadata.linkQuickPay.amountMinor / 100).toFixed(2)}`}
                    subtotal={message.metadata.linkQuickPay.subtotal}
                    taxAmount={message.metadata.linkQuickPay.taxAmount}
                    totalAmount={message.metadata.linkQuickPay.totalAmount}
                    taxLabel={message.metadata.linkQuickPay.taxLabel}
                    blockedReason={message.metadata.linkQuickPay.blockedReason}
                    checkoutState={message.metadata.linkQuickPay.status}
                    requestCorrelationId={message.metadata.linkQuickPay.requestCorrelationId}
                    attemptedMethods={message.metadata.linkQuickPay.attemptedMethods}
                    attemptTimeline={message.metadata.linkQuickPay.attemptTimeline}
                    onPay={async () => {
                      const quickPay = message.metadata?.linkQuickPay
                      if (!quickPay?.confirmationPayload) {
                        throw new Error("missing_confirmation_payload")
                      }

                      const response = await fetch("/api/agents/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: "RunAsh Agent Session",
                          message: "confirm checkout",
                          tools: ["initiate_link_checkout"],
                          toolPayloads: {
                            initiate_link_checkout: {
                              ...quickPay.confirmationPayload,
                              preview_displayed: true,
                              user_confirmation_after_preview: true,
                              human_confirmed: true,
                            },
                          },
                        }),
                      })

                      if (!response.ok) {
                        throw new Error("link_checkout_confirmation_failed")
                      }
                    }}
                    onRetry={async () => {
                      const quickPay = message.metadata?.linkQuickPay
                      if (!quickPay?.confirmationPayload) {
                        throw new Error("missing_confirmation_payload")
                      }

                      const response = await fetch("/api/agents/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: "RunAsh Agent Session",
                          message: "confirm checkout",
                          tools: ["initiate_link_checkout"],
                          toolPayloads: {
                            initiate_link_checkout: {
                              ...quickPay.confirmationPayload,
                              preview_displayed: true,
                              user_confirmation_after_preview: true,
                              human_confirmed: true,
                            },
                          },
                        }),
                      })

                      if (!response.ok) {
                        throw new Error("link_checkout_confirmation_failed")
                      }
                    }}
                  />
                </section>
              ) : null}
            </div>
          ) : null}

          {!isUser && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Message actions">
              <Button variant="ghost" size="sm" title={state.copied ? "Copied to clipboard" : "Copy message"} aria-label={state.copied ? "Copied to clipboard" : "Copy message"} onClick={handleCopy}>
                {state.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}<span className="ml-1">{state.copied ? "Copied" : "Copy"}</span>
              </Button>
              <Button variant="ghost" size="sm" title="Mark message as helpful" aria-label="Like message" onClick={() => handleFeedback("up")} disabled={state.feedbackStatus === "pending"}>
                {state.feedbackStatus === "pending" && state.feedback === "up" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className={`h-3 w-3 ${state.feedback === "up" ? "text-green-500" : ""}`} />}<span className="ml-1">Like</span>
              </Button>
              <Button variant="ghost" size="sm" title="Mark message for improvement" aria-label="Dislike message" onClick={() => handleFeedback("down")} disabled={state.feedbackStatus === "pending"}>
                {state.feedbackStatus === "pending" && state.feedback === "down" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsDown className={`h-3 w-3 ${state.feedback === "down" ? "text-red-500" : ""}`} />}<span className="ml-1">Dislike</span>
              </Button>
              <Button variant="ghost" size="sm" title="Share message" aria-label="Share message" onClick={handleShare} disabled={state.shareStatus === "pending"}>
                {state.shareStatus === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share className="h-3 w-3" />}<span className="ml-1">Share</span>
              </Button>
              <Button variant="ghost" size="sm" title={capabilities.canEdit ? "Edit and save message" : "Edit locally only (server unavailable)"} aria-label="Edit message" onClick={isEditing ? handleEdit : () => setIsEditing(true)} disabled={state.editStatus === "pending" || message.status === "streaming" || message.status === "tool-running"}>
                {state.editStatus === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}<span className="ml-1">{isEditing ? "Save edit" : "Edit"}</span>
              </Button>
              {!isUser && toolExecutions.length > 0 ? (
              <div className="mb-2 space-y-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 p-2">
                {toolExecutions.map((tool) => {
                  const isExpanded = Boolean(expandedTools[tool.id])
                  const durationLabel = formatDuration(tool.durationMs)
                  const timingLabel = tool.status === "running" ? "In progress" : durationLabel

                  return (
                    <div key={tool.id} className="rounded border border-zinc-800/80 bg-zinc-900/70">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left"
                        onClick={() => toggleToolExpansion(tool.id)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-200">
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-400" /> : <ChevronRight className="h-3 w-3 text-zinc-400" />}
                            <span className="truncate font-medium">{formatToolLabel(tool.tool)}</span>
                            {renderToolStatusChip(tool)}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                            {tool.progressLabel ? <span>{tool.progressLabel}</span> : null}
                            {timingLabel ? <span className="inline-flex items-center gap-1"><Clock3 className="h-2.5 w-2.5" />{timingLabel}</span> : null}
                          </div>
                        </div>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-300">
                          {tool.errorMessage ? <p className="mb-1 text-rose-300">{tool.errorMessage}</p> : null}
                          {tool.outputPreview ? <p className="line-clamp-3 whitespace-pre-wrap break-all">{tool.outputPreview}</p> : <p className="text-zinc-500">No output captured.</p>}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            {isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Cancel edit"
                  aria-label="Cancel edit"
                  onClick={() => {
                    setDraftContent(displayedContent)
                    setIsEditing(false)
                    setState((current) => ({ ...current, editStatus: "idle" }))
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              {capabilities.canRegenerate ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title={canRegenerateNow ? "Regenerate response" : "Wait for response to finish"}
                  aria-label="Regenerate response"
                  onClick={() => onRegenerate?.(message.id)}
                  disabled={!canRegenerateNow}
                >
                  <RefreshCw className="h-3 w-3" /> <span className="ml-1">Regenerate</span>
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" title={capabilities.canDelete ? "Delete message" : "Hide message locally (server unavailable)"} aria-label="Delete message" onClick={handleDelete} disabled={state.deleteStatus === "pending"}>
                {state.deleteStatus === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}<span className="ml-1">Delete</span>
              </Button>
              {(state.editStatus === "failed" || state.deleteStatus === "failed" || state.shareStatus === "failed" || state.feedbackStatus === "failed") && (
                <span className="inline-flex items-center text-xs text-red-500" role="status" aria-live="polite">
                  <AlertCircle className="mr-1 h-3 w-3" /> Action failed. Please retry.
                </span>
              )}
            </div>
          )}

          <div className={`mt-1 text-xs text-gray-500 ${isUser ? "text-right" : "text-left"}`}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}


export default memo(ChatMessageComponent)
