import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const CHAT_PAGE_TITLE = "RunAsh Chat"
const CHAT_PAGE_DESCRIPTION =
  "RunAsh Chat workspace for AI assistant conversations, collaborative handoffs, and operator workflows."

const ChatWorkspace = dynamic(() => import("@/components/dashboard/workspace/chat-workspace").then((mod) => mod.ChatWorkspace), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export function createChatPageMetadata(path: string = "/runashchat"): Metadata {
  return createDashboardMetadata({
    title: CHAT_PAGE_TITLE,
    description: CHAT_PAGE_DESCRIPTION,
    path,
  })
}

export function SharedChatPageShell() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <ChatWorkspace />
    </Suspense>
  )
}
