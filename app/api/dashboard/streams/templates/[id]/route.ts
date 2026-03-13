import type { DashboardStreamTemplate } from "@/lib/types/dashboard-streams"
import { handleTemplateDelete, handleTemplatePut } from "./template-by-id-route-handler"

type TemplateByIdRouteDependencies = {
  requireUserId: (request: Request) => Promise<string | Response>
  updateTemplate: (
    userId: string,
    id: string,
    input: Partial<Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">>,
  ) => Promise<DashboardStreamTemplate | null>
  deleteTemplate: (userId: string, id: string) => Promise<boolean>
}

async function resolveDefaultDependencies(): Promise<TemplateByIdRouteDependencies> {
  const [{ deleteDashboardStreamTemplate, updateDashboardStreamTemplate }, { requireStreamDashboardUserId }] =
    await Promise.all([import("@/lib/repositories/streams"), import("../../utils")])

  return {
    requireUserId: requireStreamDashboardUserId,
    updateTemplate: updateDashboardStreamTemplate,
    deleteTemplate: deleteDashboardStreamTemplate,
  }
}

export function createTemplateByIdRoutes(dependencies: TemplateByIdRouteDependencies) {
  return {
    PUT(request: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
      return handleTemplatePut(request, params.id, dependencies)
    },
    DELETE(request: Request, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
      return handleTemplateDelete(request, params.id, dependencies)
    },
  }
}

export async function PUT(
  request: Request,
  { params: routeParamsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await routeParamsPromise
  const dependencies = await resolveDefaultDependencies()
  return handleTemplatePut(request, params.id, dependencies)
}

export async function DELETE(
  request: Request,
  { params: routeParamsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await routeParamsPromise
  const dependencies = await resolveDefaultDependencies()
  return handleTemplateDelete(request, params.id, dependencies)
}
