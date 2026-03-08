import type { Metadata } from "next"
import { RunAshChatMainInterface } from "@/components/dashboard/workspace/runash-chat-main-interface"
import { createChatPageMetadata } from "../chat/_shared-chat-page"

export const metadata: Metadata = createChatPageMetadata("/dashboard/runash-chat")

export default function DashboardRunAshChatPage() {
  return <RunAshChatMainInterface />
}
