import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { ArrowRightLeft, BookOpen } from "lucide-react"
import { StandaloneWorkspacePageChrome } from "@/components/dashboard/workspace/common/standalone-workspace-page-chrome"
import { Skeleton } from "@/components/ui/skeleton"

const EditorWorkspace = dynamic(() => import("@/components/dashboard/workspace/editor-workspace").then((mod) => mod.EditorWorkspace), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export const metadata: Metadata = {
  title: "Editor Workspace | RunAsh AI",
  description: "Standalone editor workspace route for project editing, timeline management, and render workflows.",
}

export default function EditorPage() {
  return (
    <StandaloneWorkspacePageChrome
      title="Editor Workspace"
      description="Build, iterate, and ship project timelines from a focused editor surface designed for production workflows."
      breadcrumbs={[
        { label: "Workspace", href: "/dashboard" },
        { label: "Editor" },
      ]}
      headerActions={[
        {
          label: "Editor Guide",
          href: "/editor/docs",
          icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
          ariaLabel: "Open the editor guide documentation",
        },
        {
          label: "Open RunAsh Chat",
          href: "/runashchat",
          icon: <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />,
        },
      ]}
      keyboardShortcutHints={[
        { label: "Timeline play/pause", keys: ["Space"] },
        { label: "Toggle chat", keys: ["Ctrl", "J"] },
      ]}
    >
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <EditorWorkspace />
      </Suspense>
    </StandaloneWorkspacePageChrome>
  )
}
