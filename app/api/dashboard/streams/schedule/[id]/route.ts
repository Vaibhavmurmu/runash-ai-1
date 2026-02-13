import { NextResponse } from "next/server";
import { readData, writeData } from "../../utils";
import type { DashboardScheduledStream } from "@/lib/types/dashboard-streams";

type UpdateScheduleRequest = Partial<
  Omit<DashboardScheduledStream, "id" | "createdAt">
>;

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = (await request
    .json()
    .catch(() => null)) as UpdateScheduleRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = await readData();
  const index = data.scheduled.findIndex((stream) => stream.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  if (body.startsAt) {
    const startsAtDate = new Date(body.startsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    }
    body.startsAt = startsAtDate.toISOString();
  }

  const previous = data.scheduled[index];
  const updated: DashboardScheduledStream = {
    ...previous,
    ...body,
    title: body.title?.trim() || previous.title,
    description: body.description?.trim() ?? previous.description ?? "",
    updatedAt: new Date().toISOString(),
  };

  data.scheduled[index] = updated;
  await writeData(data);

  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  const data = await readData();
  const next = data.scheduled.filter((stream) => stream.id !== params.id);

  if (next.length === data.scheduled.length) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  data.scheduled = next;
  await writeData(data);

  return NextResponse.json({ ok: true });
}
