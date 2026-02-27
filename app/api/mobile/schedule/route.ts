import { z } from "zod"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { createMobileSchedule, listMobileSchedules } from "@/lib/repositories/mobile-app"

const createSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  scheduledDate: z.string().datetime(),
  duration: z.number().int().positive(),
  platforms: z.array(z.string()).default([]),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly"]),
      interval: z.number().int().positive(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      endDate: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  notificationTime: z.number().int().min(0).optional(),
  templateId: z.string().optional(),
})

export async function GET(request: Request) {
  const requestId = resolveRequestId(request)

  try {
    const response = await listMobileSchedules()
    return respondSuccess(request, response, { requestId })
  } catch {
    return respondError(request, { code: "MOBILE_SCHEDULE_FETCH_FAILED", message: "Unable to fetch mobile schedule" }, { status: 500, requestId })
  }
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request)

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = createSchema.safeParse(payload)

    if (!parsed.success) {
      return respondError(request, { code: "INVALID_REQUEST", message: "Invalid mobile schedule payload" }, { status: 400, requestId })
    }

    const response = await createMobileSchedule(parsed.data)
    return respondSuccess(request, response, { status: 201, requestId })
  } catch {
    return respondError(request, { code: "MOBILE_SCHEDULE_CREATE_FAILED", message: "Unable to create mobile schedule" }, { status: 500, requestId })
  }
}
