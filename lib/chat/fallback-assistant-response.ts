import type { ChatFallbackRequest, ChatFallbackResponse } from "@/types/chat-fallback-cards"
import type { ChatMessage, UserPreferences } from "@/types/runash-chat"

export async function buildFallbackAssistantResponse(
  userInput: string,
  userPreferences: UserPreferences,
  fetchImpl: typeof fetch = fetch,
): Promise<ChatMessage> {
  const payload: ChatFallbackRequest = { userInput, userPreferences }

  try {
    const response = await fetchImpl("/api/chat/fallback-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error("fallback_request_failed")

    const data = (await response.json()) as ChatFallbackResponse
    return {
      id: Date.now().toString(),
      content: data.content,
      role: "assistant",
      timestamp: new Date(),
      type: data.type,
      metadata: data.metadata,
    }
  } catch {
    return {
      id: Date.now().toString(),
      content: "I hit a temporary issue loading rich recommendations. Share your goal and I can still help right away.",
      role: "assistant",
      timestamp: new Date(),
      type: "text",
    }
  }
}

