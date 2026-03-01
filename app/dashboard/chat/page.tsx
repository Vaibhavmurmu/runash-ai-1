import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const ChatWorkspace = dynamic(() => import("@/components/dashboard/workspace/chat-workspace").then((mod) => mod.ChatWorkspace), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Chat",
  description: "Manage AI chat workspace operations and collaborative chat workflows from your dashboard.",
  path: "/dashboard/chat",
})

export default function DashboardChatPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <ChatWorkspace />
    </Suspense>
  )
}
