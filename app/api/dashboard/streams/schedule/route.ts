import { randomUUID } from "crypto"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { createDashboardScheduledStream } from "@/lib/repositories/streams"
import { getCanonicalStreamUrl, requireStreamDashboardUserId } from "../utils"
import type { DashboardScheduledStream, ScheduleStreamRequest, ScheduleStreamResponse } from "@/lib/types/dashboard-streams"

type ExtendedScheduleRequest = ScheduleStreamRequest & {
  description?: string
  duration?: number
  platforms?: string[]
  isRecurring?: boolean
  recurrencePattern?: DashboardScheduledStream["recurrencePattern"]
  tags?: string[]
  isPublic?: boolean
  notificationTime?: number
  templateId?: string
}

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const body = (await request.json().catch(() => null)) as ExtendedScheduleRequest | null

  if (!body?.title?.trim() || !body?.startsAt) {
    return respondError(request, { code: "INVALID_STREAM_SCHEDULE_REQUEST", message: "Missing title or startsAt" }, { status: 400, legacy: { error: "Missing title or startsAt" } })
  }

  const startsAtDate = new Date(body.startsAt)
  if (Number.isNaN(startsAtDate.getTime())) {
    return respondError(request, { code: "INVALID_STREAM_STARTS_AT", message: "Invalid startsAt" }, { status: 400, legacy: { error: "Invalid startsAt" } })
  }

  const now = new Date().toISOString()
  const id = randomUUID()
  const scheduled: DashboardScheduledStream = {
    id,
    title: body.title.trim(),
    description: body.description?.trim() || "",
    category: body.category,
    startsAt: startsAtDate.toISOString(),
    url: getCanonicalStreamUrl(id),
    status: "scheduled",
    duration: typeof body.duration === "number" ? body.duration : 60,
    platforms: Array.isArray(body.platforms) ? body.platforms : [],
    isRecurring: Boolean(body.isRecurring),
    recurrencePattern: body.recurrencePattern,
    tags: Array.isArray(body.tags) ? body.tags : [],
    isPublic: body.isPublic ?? true,
    notificationTime: typeof body.notificationTime === "number" ? body.notificationTime : 15,
    templateId: body.templateId,
    createdAt: now,
    updatedAt: now,
  }

  await createDashboardScheduledStream(scopedUserId, scheduled)

  const payload: ScheduleStreamResponse = scheduled
  return respondSuccess(request, payload, { status: 201, legacy: payload })
}
