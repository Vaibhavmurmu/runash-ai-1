"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Share, Pencil, Trash2, Loader2, Check, AlertCircle } from "lucide-react"

import type { ChatMessage } from "@/types/runash-chat"

import AutomationSuggestion from "./automation-suggestion"
import LinkQuickPayButton from "./link-quick-pay-button"
import ProductCard from "./product-card"
import RecipeCard from "./recipe-card"
import SearchResults from "./search-results"
import SustainabilityTip from "./sustainability-tip"

interface ChatMessageProps {
  message: ChatMessage
  sessionId?: string
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

export default function ChatMessageComponent({ message, sessionId }: ChatMessageProps) {
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

  const capabilities = useMemo(
    () => ({
      canCopy: true,
      canReact: true,
      canShare: true,
      canEdit: Boolean(sessionId),
      canDelete: Boolean(sessionId),
      canMutate: Boolean(sessionId),
    }),
    [sessionId],
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

    setState((current) => ({ ...current, editStatus: "pending" }))

    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content: draftContent.trim() }),
      })

      if (!response.ok) {
        throw new Error("edit_failed")
      }

      setDisplayedContent(draftContent.trim())
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

  const messageStatus = message.status ?? "completed"

  if (isDeletedLocally) {
    return null
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start space-x-3`}>
        <div
          className={`rounded-full p-2 ${isUser ? "ml-3" : "mr-3"} ${
            isUser ? "bg-gradient-to-r from-orange-600 to-yellow-500" : "bg-gradient-to-r from-green-600 to-emerald-500"
          }`}
        >
          {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
        </div>

        <div className={`flex-1 ${isUser ? "text-right" : "text-left"}`}>
          <div
            className={`rounded-lg p-3 ${
              isUser ? "bg-gradient-to-r from-orange-600 to-yellow-500 text-white" : "bg-white dark:bg-gray-800 border"
            }`}
          >
            <div className="mb-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">{messageStatus}</span>
            </div>
            {isEditing ? (
              <textarea
                aria-label="Edit chat message"
                className="w-full rounded border bg-transparent p-2 text-sm"
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
              />
            ) : (
              <p className="text-sm leading-relaxed">{displayedContent}</p>
            )}
          </div>

          {message.metadata && !isUser && (
            <div className="mt-3 space-y-3">
              {message.metadata.products && (
                <div className="grid gap-3 md:grid-cols-2">
                  {message.metadata.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
              {message.metadata.recipes && (
                <div className="space-y-3">
                  {message.metadata.recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}
              {message.metadata.tips && (
                <div className="space-y-3">
                  {message.metadata.tips.map((tip) => (
                    <SustainabilityTip key={tip.id} tip={tip} />
                  ))}
                </div>
              )}
              {message.metadata.automationSuggestions && (
                <div className="space-y-3">
                  {message.metadata.automationSuggestions.map((suggestion) => (
                    <AutomationSuggestion key={suggestion.id} suggestion={suggestion} />
                  ))}
                </div>
              )}
              {message.metadata.searchResults && message.metadata.searchResults.length > 0 && (
                <SearchResults results={message.metadata.searchResults} />
              )}

              {message.metadata.linkQuickPay && (
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
              )}
            </div>
          )}

          {!isUser && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Message actions">
              <Button
                variant="ghost"
                size="sm"
                title={state.copied ? "Copied" : "Copy message"}
                aria-label={state.copied ? "Copied message" : "Copy message"}
                onClick={handleCopy}
              >
                {state.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}<span className="ml-1">Copy</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Mark message as helpful"
                aria-label="Like message"
                onClick={() => handleFeedback("up")}
                disabled={state.feedbackStatus === "pending"}
              >
                {state.feedbackStatus === "pending" && state.feedback === "up" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className={`h-3 w-3 ${state.feedback === "up" ? "text-green-500" : ""}`} />}<span className="ml-1">Like</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Mark message for improvement"
                aria-label="Dislike message"
                onClick={() => handleFeedback("down")}
                disabled={state.feedbackStatus === "pending"}
              >
                {state.feedbackStatus === "pending" && state.feedback === "down" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsDown className={`h-3 w-3 ${state.feedback === "down" ? "text-red-500" : ""}`} />}<span className="ml-1">Dislike</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Share message"
                aria-label="Share message"
                onClick={handleShare}
                disabled={state.shareStatus === "pending"}
              >
                {state.shareStatus === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share className="h-3 w-3" />}<span className="ml-1">Share</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title={capabilities.canEdit ? "Edit message" : "Edit locally only (server unavailable)"}
                aria-label="Edit message"
                onClick={isEditing ? handleEdit : () => setIsEditing(true)}
                disabled={state.editStatus === "pending"}
              >
                {state.editStatus === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}<span className="ml-1">{isEditing ? "Save" : "Edit"}</span>
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                title={capabilities.canDelete ? "Delete message" : "Hide message locally (server unavailable)"}
                aria-label="Delete message"
                onClick={handleDelete}
                disabled={state.deleteStatus === "pending"}
              >
                {state.deleteStatus === "pending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}<span className="ml-1">Delete</span>
              </Button>
              {(state.editStatus === "failed" || state.deleteStatus === "failed" || state.shareStatus === "failed" || state.feedbackStatus === "failed") && (
                <span className="inline-flex items-center text-xs text-red-500" role="status" aria-live="polite">
                  <AlertCircle className="mr-1 h-3 w-3" /> Action failed. Please retry.
                </span>
              )}
            </div>
          )}

          <div className={`text-xs text-gray-500 mt-1 ${isUser ? "text-right" : "text-left"}`}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}
