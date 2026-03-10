import type { Metadata } from "next"
import { SharedChatPageShell } from "@/app/dashboard/chat/_shared-chat-page"

export const metadata: Metadata = {
  title: "RunAsh Chat | RunAsh AI",
  description: "Standalone RunAshChat route with App Router rendering for chat sessions and AI workflows.",
}

export default function RunAshChatPage() {
  return <SharedChatPageShell />
}
