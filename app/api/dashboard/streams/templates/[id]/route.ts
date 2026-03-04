import { NextResponse } from "next/server";
import { readData, writeData } from "../../utils";
import type { DashboardStreamTemplate } from "@/lib/types/dashboard-streams";

type UpdateTemplateRequest = Partial<
  Omit<DashboardStreamTemplate, "id" | "createdAt" | "updatedAt">
>;

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = (await request
    .json()
    .catch(() => null)) as UpdateTemplateRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = await readData();
  const templates = data.templates ?? [];
  const index = templates.findIndex((template) => template.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const previous = templates[index];
  const updated: DashboardStreamTemplate = {
    ...previous,
    ...body,
    name: body.name?.trim() || previous.name,
    title: body.title?.trim() || previous.title,
    description: body.description?.trim() ?? previous.description,
    updatedAt: new Date().toISOString(),
  };

  templates[index] = updated;
  data.templates = templates;
  await writeData(data);

  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  const data = await readData();
  const templates = data.templates ?? [];
  const next = templates.filter((template) => template.id !== params.id);

  if (next.length === templates.length) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  data.templates = next;
  await writeData(data);

  return NextResponse.json({ ok: true });
}
