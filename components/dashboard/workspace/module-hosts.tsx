"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChatWorkspace } from "@/components/dashboard/workspace/chat-workspace"
import { EditorWorkspace } from "@/components/dashboard/workspace/editor-workspace"
import { StoreWorkspace } from "@/components/dashboard/workspace/store-workspace"
import { SellerWorkspace } from "@/components/dashboard/workspace/seller-workspace"

export type WorkspaceModule = "chat" | "editor" | "store" | "seller"

type HostProps = {
  openInfo: boolean
  onOpenInfoChange: (open: boolean) => void
}

function HostFrame({
  title,
  description,
  children,
  openInfo,
  onOpenInfoChange,
}: HostProps & { title: string; description: string; children: import("react").ReactNode }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenInfoChange(true)}>
            Workspace info
          </Button>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      <Dialog open={openInfo} onOpenChange={onOpenInfoChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This module is mounted inside the dashboard shell so you can switch sections without leaving the dashboard context.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ChatHost(props: HostProps) {
  return (
    <HostFrame title="Chat workspace" description="Run assistant conversations, quick actions, and context memory." {...props}>
      <ChatWorkspace />
    </HostFrame>
  )
}

export function EditorHost(props: HostProps) {
  return (
    <HostFrame title="Editor workspace" description="Generate and edit media with timeline, canvas, and AI tools." {...props}>
      <EditorWorkspace />
    </HostFrame>
  )
}

export function StoreHost(props: HostProps) {
  return (
    <HostFrame title="Store workspace" description="Track inventory health, orders, and stock alerts in one view." {...props}>
      <StoreWorkspace />
    </HostFrame>
  )
}

export function SellerHost(props: HostProps) {
  return (
    <HostFrame title="Seller workspace" description="Manage streams, products, operations, and payouts." {...props}>
      <SellerWorkspace />
    </HostFrame>
  )
}
