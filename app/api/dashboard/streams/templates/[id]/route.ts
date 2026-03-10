import {
  deleteDashboardStreamTemplate,
  updateDashboardStreamTemplate,
} from "@/lib/repositories/streams"
import { requireStreamDashboardUserId } from "../../utils"
import { handleTemplateDelete, handleTemplatePut } from "./template-by-id-route-handler"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  return handleTemplatePut(request, params.id, {
    requireUserId: requireStreamDashboardUserId,
    updateTemplate: updateDashboardStreamTemplate,
    deleteTemplate: deleteDashboardStreamTemplate,
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  return handleTemplateDelete(request, params.id, {
    requireUserId: requireStreamDashboardUserId,
    updateTemplate: updateDashboardStreamTemplate,
    deleteTemplate: deleteDashboardStreamTemplate,
  })
}
