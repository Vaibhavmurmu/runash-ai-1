import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData } from "../utils";
import type {
  DashboardStreamTemplate,
  DashboardStreamTemplatesResponse,
} from "@/lib/types/dashboard-streams";

type CreateTemplateRequest = Omit<
  DashboardStreamTemplate,
  "id" | "createdAt" | "updatedAt"
>;

export async function GET() {
  const data = await readData();
  const payload: DashboardStreamTemplatesResponse = {
    templates: [...(data.templates ?? [])].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  };

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as Partial<CreateTemplateRequest> | null;
  if (!body?.name?.trim() || !body?.title?.trim()) {
    return NextResponse.json(
      { error: "Missing template name or title" },
      { status: 400 },
    );
  }

  const data = await readData();
  const now = new Date().toISOString();
  const template: DashboardStreamTemplate = {
    id: uuidv4(),
    name: body.name.trim(),
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    duration: typeof body.duration === "number" ? body.duration : 60,
    platforms: Array.isArray(body.platforms) ? body.platforms : [],
    thumbnail: body.thumbnail,
    tags: Array.isArray(body.tags) ? body.tags : [],
    category: body.category ?? "Gaming",
    isPublic: body.isPublic ?? true,
    createdAt: now,
    updatedAt: now,
  };

  data.templates = [template, ...(data.templates ?? [])];
  await writeData(data);

  return NextResponse.json(template, { status: 201 });
}
