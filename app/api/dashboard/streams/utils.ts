import { promises as fs } from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { requireDashboardSessionUserId } from "../_auth"
import { listDashboardRecentStreams, listDashboardScheduledStreams } from "@/lib/repositories/streams"
import type { DashboardStreamsStore } from "@/lib/types/dashboard-streams"

const DEV_FALLBACK_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.RUNASH_STREAMS_DEV_FALLBACK === "1"
const DATA_FILE = path.join(process.cwd(), "data", "streams.json")

export function getCanonicalStreamUrl(id: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "")
  return `${base}/stream/${id}`
}

export async function requireStreamDashboardUserId(request: Request): Promise<string | NextResponse> {
  return requireDashboardSessionUserId(request)
}

async function readFallbackFile(): Promise<DashboardStreamsStore> {
  if (!DEV_FALLBACK_ENABLED) {
    return { recent: [], scheduled: [], invites: [], templates: [] }
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw) as Partial<DashboardStreamsStore>
    return {
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
    }
  } catch {
    return { recent: [], scheduled: [], invites: [], templates: [] }
  }
}

export async function readData(userId: string): Promise<DashboardStreamsStore> {
  const [recent, scheduled, fallback] = await Promise.all([
    listDashboardRecentStreams(userId, 50),
    listDashboardScheduledStreams(userId),
    readFallbackFile(),
  ])

  return {
    recent,
    scheduled,
    invites: fallback.invites,
    templates: fallback.templates,
  }
}

export async function writeData(data: DashboardStreamsStore) {
  if (!DEV_FALLBACK_ENABLED) {
    return
  }

  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8")
}
