import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

type LibrarySegment = "recent" | "latest" | "previous" | "all"
type LibrarySort = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "views-desc" | "views-asc"

type LibraryItem = {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  recordingUrl: string
  duration: number
  fileSize: number
  createdAt: string
  platforms: string[]
  viewCount: number
  downloadCount: number
  isProcessing: boolean
  isPublic: boolean
  tags: string[]
  quality: "low" | "medium" | "high" | "source"
  format: "mp4" | "webm" | "mkv"
  status: string
  sourceType: "recording" | "stream"
  segment: Exclude<LibrarySegment, "all">
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

const toSegment = (createdAt: Date): Exclude<LibrarySegment, "all"> => {
  const ageInDays = (Date.now() - createdAt.getTime()) / DAY_IN_MS
  if (ageInDays <= 7) return "recent"
  if (ageInDays <= 30) return "latest"
  return "previous"
}

const normalizeQuality = (quality: unknown): "low" | "medium" | "high" | "source" => {
  if (quality === "low" || quality === "medium" || quality === "high" || quality === "source") {
    return quality
  }

  return "high"
}

const parsePositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const session = await getServerAuthSession()
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const { searchParams } = new URL(req.url)
    const page = parsePositiveInt(searchParams.get("page"), 1)
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 12), 50)
    const segment = (searchParams.get("segment") ?? "all") as LibrarySegment
    const search = (searchParams.get("search") ?? "").trim().toLowerCase()
    const sort = (searchParams.get("sort") ?? "date-desc") as LibrarySort
    const platform = (searchParams.get("platform") ?? "all").toLowerCase()
    const status = (searchParams.get("status") ?? "all").toLowerCase()

    const [streams, recordings] = await Promise.all([
      Database.getUserStreams(session.user.id),
      Database.query<{
        id: string
        title: string
        description: string | null
        duration: number | null
        file_size: number | null
        thumbnail_url: string | null
        recording_url: string | null
        status: string | null
        quality: string | null
        created_at: string | Date
        tags: string[] | null
        privacy: string | null
        platform: string | null
        view_count: number | null
      }>(
        `SELECT id, title, description, duration, file_size, thumbnail_url, recording_url, status, quality, created_at, tags, privacy, platform, view_count
         FROM recordings
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [session.user.id],
      ),
    ])

    const streamItems: LibraryItem[] = streams.map((stream) => {
      const createdAt = new Date(stream.created_at)
      const platformName = stream.platform ?? "unknown"
      return {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        thumbnailUrl: undefined,
        recordingUrl: "",
        duration: 0,
        fileSize: 0,
        createdAt: createdAt.toISOString(),
        platforms: [platformName],
        viewCount: stream.viewer_count ?? 0,
        downloadCount: 0,
        isProcessing: stream.status === "live" || stream.status === "scheduled",
        isPublic: false,
        tags: [],
        quality: "high",
        format: "mp4",
        status: stream.status,
        sourceType: "stream",
        segment: toSegment(createdAt),
      }
    })

    const recordingItems: LibraryItem[] = recordings.map((recording) => {
      const createdAt = new Date(recording.created_at)
      return {
        id: recording.id,
        title: recording.title,
        description: recording.description ?? undefined,
        thumbnailUrl: recording.thumbnail_url ?? undefined,
        recordingUrl: recording.recording_url ?? "",
        duration: recording.duration ?? 0,
        fileSize: recording.file_size ?? 0,
        createdAt: createdAt.toISOString(),
        platforms: [recording.platform || "unknown"],
        viewCount: recording.view_count ?? 0,
        downloadCount: 0,
        isProcessing: recording.status === "processing",
        isPublic: recording.privacy === "public",
        tags: recording.tags || [],
        quality: normalizeQuality(recording.quality),
        format: "mp4",
        status: recording.status ?? "completed",
        sourceType: "recording",
        segment: toSegment(createdAt),
      }
    })

    const filteredItems = [...recordingItems, ...streamItems]
      .filter((item) => {
        if (segment !== "all" && item.segment !== segment) return false
        if (platform !== "all" && !item.platforms.some((itemPlatform) => itemPlatform.toLowerCase() === platform)) {
          return false
        }
        if (status !== "all" && item.status.toLowerCase() !== status) return false

        if (!search) return true

        return (
          item.title.toLowerCase().includes(search) ||
          (item.description?.toLowerCase().includes(search) ?? false) ||
          item.tags.some((tag) => tag.toLowerCase().includes(search))
        )
      })
      .sort((a, b) => {
        switch (sort) {
          case "date-asc":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          case "title-asc":
            return a.title.localeCompare(b.title)
          case "title-desc":
            return b.title.localeCompare(a.title)
          case "views-desc":
            return b.viewCount - a.viewCount
          case "views-asc":
            return a.viewCount - b.viewCount
          case "date-desc":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })

    const start = (page - 1) * pageSize
    const items = filteredItems.slice(start, start + pageSize)

    const payload = {
      items,
      pagination: {
        page,
        pageSize,
        total: filteredItems.length,
        hasMore: start + pageSize < filteredItems.length,
      },
    }

    return respondSuccess(req, payload, { requestId, legacy: payload })
  } catch {
    return respondError(req, { code: "STREAM_LIBRARY_LOAD_FAILED", message: "Unable to load stream library." }, { status: 500, requestId })
  }
}
