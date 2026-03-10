import type { DashboardStreamTemplate } from "@/lib/types/dashboard-streams"
import { handleTemplatesGet, handleTemplatesPost } from "./templates-route-handler"

type TemplateRouteDependencies = {
  requireUserId: (request: Request) => Promise<string | Response>
  listTemplates: (userId: string) => Promise<DashboardStreamTemplate[]>
  createTemplate: (
    userId: string,
    input: Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">,
  ) => Promise<DashboardStreamTemplate>
}

async function resolveDefaultDependencies(): Promise<TemplateRouteDependencies> {
  const [{ createDashboardStreamTemplate, listDashboardStreamTemplates }, { requireStreamDashboardUserId }] =
    await Promise.all([import("@/lib/repositories/streams"), import("../utils")])

  return {
    requireUserId: requireStreamDashboardUserId,
    listTemplates: listDashboardStreamTemplates,
    createTemplate: createDashboardStreamTemplate,
  }
}

export function createTemplateRoutes(dependencies: TemplateRouteDependencies) {
  return {
    GET(request: Request) {
      return handleTemplatesGet(request, dependencies)
    },
    POST(request: Request) {
      return handleTemplatesPost(request, dependencies)
    },
  }
}

export async function GET(request: Request) {
  const dependencies = await resolveDefaultDependencies()
  return handleTemplatesGet(request, dependencies)
}

export async function POST(request: Request) {
  const dependencies = await resolveDefaultDependencies()
  return handleTemplatesPost(request, dependencies)
}
