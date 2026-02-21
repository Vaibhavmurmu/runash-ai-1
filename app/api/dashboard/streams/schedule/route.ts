import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createDashboardScheduledStream } from "@/lib/repositories/streams";
import { getCanonicalStreamUrl, requireStreamDashboardUserId } from "../utils";
import type {
  DashboardScheduledStream,
  ScheduleStreamRequest,
  ScheduleStreamResponse,
} from "@/lib/types/dashboard-streams";

type ExtendedScheduleRequest = ScheduleStreamRequest & {
  description?: string;
  duration?: number;
  platforms?: string[];
  isRecurring?: boolean;
  recurrencePattern?: DashboardScheduledStream["recurrencePattern"];
  tags?: string[];
  isPublic?: boolean;
  notificationTime?: number;
  templateId?: string;
};

export async function POST(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request);
  if (scopedUserId instanceof NextResponse) return scopedUserId;

  const body = (await request
    .json()
    .catch(() => null)) as ExtendedScheduleRequest | null;

  if (!body?.title?.trim() || !body?.startsAt) {
    return NextResponse.json(
      { error: "Missing title or startsAt" },
      { status: 400 },
    );
  }

  const startsAtDate = new Date(body.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = uuidv4();
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
    notificationTime:
      typeof body.notificationTime === "number" ? body.notificationTime : 15,
    templateId: body.templateId,
    createdAt: now,
    updatedAt: now,
  };

  await createDashboardScheduledStream(scopedUserId, scheduled);

  const payload: ScheduleStreamResponse = scheduled;
  return NextResponse.json(payload, { status: 201 });
}
