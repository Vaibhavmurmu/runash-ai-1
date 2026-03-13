import { type NextRequest, NextResponse } from "next/server"
import { respondError } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { getServerAuthSession } from "@/lib/auth/session"
import { Database } from "@/lib/database"
import type { StudioRecordingPayload } from "@/lib/analytics-pro"

const ROUTE = "/api/streams/sessions/[id]/recordings"

type StreamRecordingsDependencies = {
  getSession: typeof getServerAuthSession
  getStream: typeof Database.getStream
  getRecordings: typeof Database.getRecordings
  createRecording: typeof Database.createRecording
}

const defaultDependencies: StreamRecordingsDependencies = {
  getSession: getServerAuthSession,
  getStream: Database.getStream,
  getRecordings: Database.getRecordings,
  createRecording: Database.createRecording,
}

async function authorizeStreamSessionAccess(
  req: NextRequest,
  streamSessionId: string,
  dependencies: StreamRecordingsDependencies,
) {
  const requestId = req.headers.get("x-correlation-id") ?? req.headers.get("x-request-id") ?? crypto.randomUUID()
  const session = await dependencies.getSession(req.headers)
  if (!session) {
    return {
      ok: false as const,
      requestId,
      response: respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId, legacy: { error: "Unauthorized" } }),
    }
  }

  const stream = await dependencies.getStream(streamSessionId)
  if (!stream) {
    return {
      ok: false as const,
      requestId,
      userId: session.user.id,
      response: respondError(
        req,
        { code: "STREAM_SESSION_NOT_FOUND", message: "Stream session not found" },
        { status: 404, requestId, legacy: { error: "Stream session not found" } },
      ),
    }
  }

  if (String(stream.user_id) !== String(session.user.id)) {
    return {
      ok: false as const,
      requestId,
      userId: session.user.id,
      response: respondError(req, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, requestId, legacy: { error: "Forbidden" } }),
    }
  }

  return { ok: true as const, requestId, session }
}

export async function handleGetSessionRecordings(
  req: NextRequest,
  params: { id: string },
  dependencies: StreamRecordingsDependencies = defaultDependencies,
) {
  const access = await authorizeStreamSessionAccess(req, params.id, dependencies)
  if (!access.ok) {
    return access.response
  }

  const recordings = await dependencies.getRecordings(params.id)

  logApiEvent("info", "streams.sessions.recordings.read", {
    requestId: access.requestId,
    route: ROUTE,
    method: req.method,
    userId: access.session.user.id,
    details: {
      operation: "stream-session-recordings-read",
      streamSessionId: params.id,
      totalRecordings: recordings.length,
    },
  })

  return NextResponse.json({
    recordings: recordings.map((recording) => ({
      id: recording.id,
      streamId: recording.stream_id,
      fileUrl: recording.file_url,
      duration: recording.duration,
      fileSize: recording.file_size,
      createdAt: recording.created_at,
    })),
  })
}

export async function handleCreateSessionRecording(
  req: NextRequest,
  params: { id: string },
  dependencies: StreamRecordingsDependencies = defaultDependencies,
) {
  const access = await authorizeStreamSessionAccess(req, params.id, dependencies)
  if (!access.ok) {
    return access.response
  }

  const body = (await req.json()) as Partial<StudioRecordingPayload>

  const storage = body.storage === "local" ? "local" : "cloud"
  const title = body.title?.trim() || `Live recording ${new Date().toLocaleString()}`
  const durationSeconds = Math.max(1, Number(body.durationSeconds ?? 90))
  const includeTranscript = Boolean(body.includeTranscript)

  const recording = await dependencies.createRecording({
    stream_id: params.id,
    duration: durationSeconds,
    file_size: Math.round(durationSeconds * (storage === "cloud" ? 1024 * 60 : 1024 * 40)),
    file_url: `${storage}://stream-recordings/${params.id}/${Date.now()}.mp4`,
    thumbnail_url: null,
  })

  logApiEvent("info", "streams.sessions.recordings.create", {
    requestId: access.requestId,
    route: ROUTE,
    method: req.method,
    userId: access.session.user.id,
    details: {
      operation: "stream-session-recording-create",
      streamSessionId: params.id,
      recordingId: recording.id,
      storage,
      includeTranscript,
    },
  })

  return NextResponse.json({
    recording: {
      ...recording,
      title,
      storage,
      transcriptStatus: includeTranscript ? "queued" : "disabled",
    },
  })
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return handleGetSessionRecordings(req, params)
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return handleCreateSessionRecording(req, params)
}
