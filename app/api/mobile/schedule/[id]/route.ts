import { z } from "zod"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { deleteMobileSchedule, updateMobileSchedule } from "@/lib/repositories/mobile-app"

const updateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    scheduledDate: z.string().datetime().optional(),
    duration: z.number().int().positive().optional(),
    platforms: z.array(z.string()).optional(),
    isRecurring: z.boolean().optional(),
    recurrencePattern: z
      .object({
        frequency: z.enum(["daily", "weekly", "monthly"]),
        interval: z.number().int().positive(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        endDate: z.string().optional(),
      })
      .nullable()
      .optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    isPublic: z.boolean().optional(),
    notificationTime: z.number().int().min(0).optional(),
    templateId: z.string().optional(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "At least one field must be provided")

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const requestId = resolveRequestId(request)
  const { id } = params

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(payload)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid mobile schedule update payload" }, { status: 400, requestId })
    }

    const response = await updateMobileSchedule(id, parsed.data)

    if (!response) {
      return respondError(request, { code: "NOT_FOUND", message: "Schedule stream not found" }, { status: 404, requestId })
    }

    if (response.conflict) {
      return respondSuccess(request, response, { status: 409, requestId })
    }

    return respondSuccess(request, response, { requestId })
  } catch {
    return respondError(request, { code: "MOBILE_SCHEDULE_UPDATE_FAILED", message: "Unable to update mobile schedule" }, { status: 500, requestId })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const requestId = resolveRequestId(request)
  const { id } = params

  try {
    const { searchParams } = new URL(request.url)
    const expectedVersionRaw = searchParams.get("expectedVersion")
    const expectedVersion = expectedVersionRaw ? Number(expectedVersionRaw) : undefined

    const response = await deleteMobileSchedule(id, Number.isFinite(expectedVersion) ? expectedVersion : undefined)
    if (!response) {
      return respondError(request, { code: "NOT_FOUND", message: "Schedule stream not found" }, { status: 404, requestId })
    }

    if (response.conflict) {
      return respondSuccess(request, response, { status: 409, requestId })
    }

    return respondSuccess(request, response, { requestId })
  } catch {
    return respondError(request, { code: "MOBILE_SCHEDULE_DELETE_FAILED", message: "Unable to delete mobile schedule" }, { status: 500, requestId })
  }
}
