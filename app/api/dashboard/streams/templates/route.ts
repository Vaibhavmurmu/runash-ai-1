import {
  createDashboardStreamTemplate,
  listDashboardStreamTemplates,
} from "@/lib/repositories/streams"
import { requireStreamDashboardUserId } from "../utils"
import { handleTemplatesGet, handleTemplatesPost } from "./templates-route-handler"

export async function GET(request: Request) {
  return handleTemplatesGet(request, {
    requireUserId: requireStreamDashboardUserId,
    listTemplates: listDashboardStreamTemplates,
    createTemplate: createDashboardStreamTemplate,
  })
}

export async function POST(request: Request) {
  return handleTemplatesPost(request, {
    requireUserId: requireStreamDashboardUserId,
    listTemplates: listDashboardStreamTemplates,
    createTemplate: createDashboardStreamTemplate,
  })
}
