import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { ArrowRightLeft, BookOpen } from "lucide-react"
import { StandaloneWorkspacePageChrome } from "@/components/dashboard/workspace/common/standalone-workspace-page-chrome"
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
    <StandaloneWorkspacePageChrome
      title="RunAsh Chat Workspace"
      description="Coordinate AI conversations, quick actions, and handoffs in the same standalone workspace shell as editor routes."
      breadcrumbs={[
        { label: "Workspace", href: "/dashboard" },
        { label: "RunAsh Chat" },
      ]}
      headerActions={[
        {
          label: "Open Editor",
          href: "/editor",
          icon: <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />,
        },
        {
          label: "Chat docs",
          href: "/dashboard/documentation/workspace-ui-style-guide",
          icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
        },
      ]}
      keyboardShortcutHints={[
        { label: "History drawer", keys: ["Ctrl", "["] },
        { label: "Tools drawer", keys: ["Ctrl", "]"] },
      ]}
    >
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <ChatWorkspace />
      </Suspense>
    </StandaloneWorkspacePageChrome>
  )
}
