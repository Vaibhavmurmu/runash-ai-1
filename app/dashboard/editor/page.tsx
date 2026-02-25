import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createDashboardMetadata } from "../metadata"

const EditorWorkspace = dynamic(() => import("@/components/dashboard/workspace/editor-workspace").then((mod) => mod.EditorWorkspace), {
  loading: () => <Skeleton className="h-[560px] w-full" />,
})

export const metadata: Metadata = createDashboardMetadata({
  title: "Editor Workspace",
  description: "Open the dashboard editor workspace for production tooling, draft management, and content workflows.",
  path: "/dashboard/editor",
})

export default function DashboardEditorPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
      <EditorWorkspace />
    </Suspense>
  )
}
