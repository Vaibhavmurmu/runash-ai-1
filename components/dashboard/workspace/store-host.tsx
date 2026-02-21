"use client"

import { WorkspaceHostFrame } from "@/components/dashboard/workspace/workspace-host-frame"
import { StoreWorkspace } from "@/components/dashboard/workspace/store-workspace"

type HostProps = {
  openInfo: boolean
  onOpenInfoChange: (open: boolean) => void
}

export function StoreHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Store workspace" description="Track inventory health, orders, and stock alerts in one view." {...props}>
      <StoreWorkspace />
    </WorkspaceHostFrame>
  )
}
