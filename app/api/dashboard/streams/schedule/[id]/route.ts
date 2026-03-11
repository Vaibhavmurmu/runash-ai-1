import { NextResponse } from "next/server"
import { deleteStream, getStream, updateStream } from "@/lib/repositories/streams"
import { requireStreamDashboardUserId } from "../../utils"
import type { DashboardScheduledStream } from "@/lib/types/dashboard-streams"

type UpdateScheduleRequest = Partial<
  Omit<DashboardScheduledStream, "id" | "createdAt">
>

async function handleScheduleUpdate(request: Request, streamId: string) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const body = (await request
    .json()
    .catch(() => null)) as UpdateScheduleRequest | null
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const current = await getStream(streamId)
  if (!current || current.user_id !== scopedUserId) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 })
  }

  let scheduledStart = current.scheduled_start
  if (body.startsAt) {
    const startsAtDate = new Date(body.startsAt)
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 })
    }
    scheduledStart = startsAtDate.toISOString()
  }

  const settings = (current.settings && typeof current.settings === "object") ? current.settings : {}
  const mergedSettings = {
    ...settings,
    url: body.url ?? settings.url,
    duration: body.duration ?? settings.duration ?? 60,
    platforms: body.platforms ?? settings.platforms ?? [],
    isRecurring: body.isRecurring ?? settings.isRecurring ?? false,
    recurrencePattern: body.recurrencePattern ?? settings.recurrencePattern,
    tags: body.tags ?? settings.tags ?? [],
    isPublic: body.isPublic ?? settings.isPublic ?? true,
    notificationTime: body.notificationTime ?? settings.notificationTime ?? 15,
    templateId: body.templateId ?? settings.templateId,
  }

  const nextStatus = body.status === "scheduled" || body.status === "cancelled" || body.status === "live" || body.status === "ended"
    ? body.status
    : current.status

  const updated = await updateStream(streamId, {
    title: body.title?.trim() || current.title,
    description: body.description?.trim() ?? current.description,
    category: body.category ?? current.category,
    status: nextStatus,
    scheduled_start: scheduledStart,
    actual_start: nextStatus === "live" && !current.actual_start ? new Date().toISOString() : current.actual_start,
    settings: mergedSettings,
  })

  if (!updated) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  return handleScheduleUpdate(request, params.id)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  return handleScheduleUpdate(request, params.id)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof Response) return scopedUserId

  const current = await getStream(params.id)
  if (!current || current.user_id !== scopedUserId || current.status !== "scheduled") {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 })
  }

  await deleteStream(params.id)

  return NextResponse.json({ ok: true })
}
