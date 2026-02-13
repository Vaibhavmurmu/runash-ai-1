import { NextResponse } from "next/server";
import { getCanonicalStreamUrl, readData } from "../utils";
import type {
  DashboardScheduledStream,
  DashboardScheduledStreamsResponse,
} from "@/lib/types/dashboard-streams";

export async function GET() {
  const data = await readData();
  const payload: DashboardScheduledStreamsResponse = {
    streams: data.scheduled.map((stream) => {
      const startsAt =
        stream.startsAt ??
        (stream as DashboardScheduledStream & { dateTime?: string }).dateTime;

      return {
        ...stream,
        startsAt: startsAt ?? new Date().toISOString(),
        url: stream.url || getCanonicalStreamUrl(stream.id),
        status: stream.status ?? "scheduled",
        description: stream.description ?? "",
        duration: stream.duration ?? 60,
        platforms: stream.platforms ?? [],
        isRecurring: stream.isRecurring ?? false,
        tags: stream.tags ?? [],
        isPublic: stream.isPublic ?? true,
        notificationTime: stream.notificationTime ?? 15,
        createdAt: stream.createdAt ?? new Date().toISOString(),
        updatedAt: stream.updatedAt ?? new Date().toISOString(),
      };
    }),
  };
  return NextResponse.json(payload);
}
