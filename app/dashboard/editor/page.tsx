import type { Metadata } from "next"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Suspense } from "react"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Link href="/editor/docs" aria-label="Open the editor guide documentation">
            <BookOpen className="h-4 w-4" />
            Editor Guide
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <EditorWorkspace />
      </Suspense>
    </div>
  )
}
