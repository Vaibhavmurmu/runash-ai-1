import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { createTemplate, listTemplatesForViewer } from "@/lib/repositories/templates"
import { handleGetTemplates, handlePostTemplate } from "./templates-route-handler"

const deps = {
  getSession: getServerAuthSession,
  listTemplatesForViewer,
  createTemplate,
}

export async function GET(req: NextRequest) {
  return handleGetTemplates(req, deps)
}

export async function POST(req: NextRequest) {
  return handlePostTemplate(req, deps)
}
