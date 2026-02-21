"use client"

import { WorkspaceHostFrame } from "@/components/dashboard/workspace/workspace-host-frame"
import { ChatWorkspace } from "@/components/dashboard/workspace/chat-workspace"

type HostProps = {
  openInfo: boolean
  onOpenInfoChange: (open: boolean) => void
}

export function ChatHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Chat workspace" description="Run assistant conversations, quick actions, and context memory." {...props}>
      <ChatWorkspace />
    </WorkspaceHostFrame>
  )
}
