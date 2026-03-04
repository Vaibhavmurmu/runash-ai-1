"use client"

import { WorkspaceHostFrame } from "@/components/dashboard/workspace/workspace-host-frame"
import { SellerWorkspace } from "@/components/dashboard/workspace/seller-workspace"

type HostProps = {
  openInfo: boolean
  onOpenInfoChange: (open: boolean) => void
}

export function SellerHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Seller workspace" description="Manage streams, products, operations, and payouts." {...props}>
      <SellerWorkspace />
    </WorkspaceHostFrame>
  )
}
