import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { getTemplateByIdWithAccess } from "@/lib/repositories/templates"
import { handleGetTemplateById } from "./template-by-id-route-handler"

const deps = {
  getSession: getServerAuthSession,
  getTemplateByIdWithAccess,
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return handleGetTemplateById(params.id, deps)
}
