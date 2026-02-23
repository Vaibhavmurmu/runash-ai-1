"use client"

import { WorkspaceHostFrame } from "@/components/dashboard/workspace/workspace-host-frame"
import { ChatWorkspace } from "@/components/dashboard/workspace/chat-workspace"
import { EditorWorkspace } from "@/components/dashboard/workspace/editor-workspace"
import { StoreWorkspace } from "@/components/dashboard/workspace/store-workspace"
import { SellerWorkspace } from "@/components/dashboard/workspace/seller-workspace"

export type WorkspaceModule = "chat" | "editor" | "store" | "seller"

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

export function EditorHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Editor workspace" description="Generate and edit media with timeline, canvas, and AI tools." {...props}>
      <EditorWorkspace />
    </WorkspaceHostFrame>
  )
}

export function StoreHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Store workspace" description="Track inventory health, orders, and stock alerts in one view." {...props}>
      <StoreWorkspace />
    </WorkspaceHostFrame>
  )
}

export function SellerHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Seller workspace" description="Manage streams, products, operations, and payouts." {...props}>
      <SellerWorkspace />
    </WorkspaceHostFrame>
  )
}
