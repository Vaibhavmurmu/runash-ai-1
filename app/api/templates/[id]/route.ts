import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { getTemplateByIdWithAccess } from "@/lib/repositories/templates"
import { handleGetTemplateById } from "./template-by-id-route-handler"

const deps = {
  getSession: getServerAuthSession,
  getTemplateByIdWithAccess,
}

export async function GET(_req: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  return handleGetTemplateById(params.id, deps)
}
