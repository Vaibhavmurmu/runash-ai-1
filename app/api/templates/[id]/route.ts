import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { getTemplateById, getTemplateByIdForViewer } from "@/lib/repositories/templates"
import { handleGetTemplateById } from "./template-by-id-route-handler"

const deps = {
  getSession: getServerAuthSession,
  getTemplateById,
  getTemplateByIdForViewer,
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleGetTemplateById(params.id, deps)
}
