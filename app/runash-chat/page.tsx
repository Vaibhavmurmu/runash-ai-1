import type { Metadata } from "next"
import { RunashChatLanding } from "@/components/runash-chat/runash-chat-landing"

export const metadata: Metadata = {
  title: "RunAshChat | AI Chat Platform",
  description: "RunAshChat landing page with real product capabilities, backend connectivity, and integration overview.",
}

export default function RunAshChatPage() {
  return <RunashChatLanding />
}
