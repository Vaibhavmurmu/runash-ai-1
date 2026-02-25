"use client"
import { Button } from "@/components/ui/button"
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Share } from "lucide-react"
import type { ChatMessage } from "@/types/runash-chat"
import ProductCard from "./product-card"
import RecipeCard from "./recipe-card"
import SustainabilityTip from "./sustainability-tip"
import AutomationSuggestion from "./automation-suggestion"
import SearchResults from "./search-results"
import LinkQuickPayButton from "./link-quick-pay-button"

interface ChatMessageProps {
  message: ChatMessage
}

export default function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleFeedback = (type: "up" | "down") => {
    fetch("/api/agents/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "chat-ui",
        messageId: message.id,
        signal: type === "up" ? "quality" : "safety",
        score: type === "up" ? 5 : 2,
        reason: type === "up" ? "helpful" : "needs-improvement",
      }),
    }).catch(() => undefined)
  }

  const messageStatus = message.status ?? "completed"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start space-x-3`}>
        {/* Avatar */}
        <div
          className={`rounded-full p-2 ${isUser ? "ml-3" : "mr-3"} ${
            isUser ? "bg-gradient-to-r from-orange-600 to-yellow-500" : "bg-gradient-to-r from-green-600 to-emerald-500"
          }`}
        >
          {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? "text-right" : "text-left"}`}>
          <div
            className={`rounded-lg p-3 ${
              isUser ? "bg-gradient-to-r from-orange-600 to-yellow-500 text-white" : "bg-white dark:bg-gray-800 border"
            }`}
          >
            <div className="mb-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-500">{messageStatus}</span>
            </div>
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>

          {/* Metadata Content */}
          {message.metadata && !isUser && (
            <div className="mt-3 space-y-3">
              {/* Products */}
              {message.metadata.products && (
                <div className="grid gap-3 md:grid-cols-2">
                  {message.metadata.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {/* Recipes */}
              {message.metadata.recipes && (
                <div className="space-y-3">
                  {message.metadata.recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              )}

              {/* Sustainability Tips */}
              {message.metadata.tips && (
                <div className="space-y-3">
                  {message.metadata.tips.map((tip) => (
                    <SustainabilityTip key={tip.id} tip={tip} />
                  ))}
                </div>
              )}

              {/* Automation Suggestions */}
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
                  attemptTimeline={message.metadata.linkQuickPay.attemptTimeline}
                  onPay={async () => {
                    const executeLinkCheckout = async () => {
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
                    }

                    await executeLinkCheckout()
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

          {/* Message Actions */}
          {!isUser && (
            <div className="flex items-center space-x-2 mt-2">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleFeedback("up")}>
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleFeedback("down")}>
                <ThumbsDown className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm">
                <Share className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? "text-right" : "text-left"}`}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}
