import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { selectQuestion } from "@/lib/live-interactions"

export async function PATCH(req: NextRequest, { params }: { params: { id: string; questionId: string } }) {
  const session = await getServerAuthSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { selected?: boolean } | null
  if (!body || typeof body.selected !== "boolean") {
    return NextResponse.json({ error: "selected boolean is required" }, { status: 400 })
  }

  const question = await selectQuestion(params.id, params.questionId, body.selected)
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 })
  }

  return NextResponse.json({ question })
}
