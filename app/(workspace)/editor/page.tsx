import type { Metadata } from "next"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Suspense } from "react"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <div className="mx-auto w-full max-w-[1200px] space-y-4 p-4 md:p-6">
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm" className="gap-2">
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
