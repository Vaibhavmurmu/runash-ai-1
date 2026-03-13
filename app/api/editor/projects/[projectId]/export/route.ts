import { NextResponse } from "next/server"
import { requireEditorOperation } from "@/app/api/editor/_lib"
import { getProjectById } from "@/lib/editor/repository"

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const params = await context.params
  const auth = await requireEditorOperation(request, "edit_timeline")
  if ("error" in auth) return auth.error

  const project = await getProjectById(auth.userId, params.projectId)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  return new Response(JSON.stringify(project, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${project.name.replace(/\s+/g, "-").toLowerCase()}-metadata.json"`,
    },
  })
}
