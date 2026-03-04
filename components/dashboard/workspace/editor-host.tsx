"use client"

import { WorkspaceHostFrame } from "@/components/dashboard/workspace/workspace-host-frame"
import { EditorWorkspace } from "@/components/dashboard/workspace/editor-workspace"

type HostProps = {
  openInfo: boolean
  onOpenInfoChange: (open: boolean) => void
}

export function EditorHost(props: HostProps) {
  return (
    <WorkspaceHostFrame title="Editor workspace" description="Generate and edit media with timeline, canvas, and AI tools." {...props}>
      <EditorWorkspace />
    </WorkspaceHostFrame>
  )
}
