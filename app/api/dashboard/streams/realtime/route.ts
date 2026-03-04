import { NextResponse } from "next/server"
import { requireStreamDashboardUserId } from "../utils"

const HEARTBEAT_INTERVAL_MS = 15000
const EVENT_INTERVAL_MS = 2500

type StreamStatus = "queued" | "scheduled" | "live" | "ended"

type StreamState = {
  id: string
  status: StreamStatus
  concurrentViewers: number
  engagement: {
    likes: number
    comments: number
    shares: number
    reactions: number
  }
}

const STATUS_TRANSITIONS: Record<StreamStatus, StreamStatus> = {
  queued: "live",
  scheduled: "queued",
  live: "ended",
  ended: "queued",
}

function parseStreamIds(request: Request) {
  const { searchParams } = new URL(request.url)
  const streamIds = (searchParams.get("streamIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  return streamIds.length > 0 ? streamIds : ["stream-1", "stream-2", "stream-3"]
}

function createSeedStates(streamIds: string[]): Record<string, StreamState> {
  return streamIds.reduce<Record<string, StreamState>>((acc, streamId, index) => {
    acc[streamId] = {
      id: streamId,
      status: index % 3 === 0 ? "live" : index % 2 === 0 ? "queued" : "scheduled",
      concurrentViewers: 100 + index * 35,
      engagement: {
        likes: 25 + index * 5,
        comments: 8 + index * 2,
        shares: 4 + index,
        reactions: 12 + index * 3,
      },
    }
    return acc
  }, {})
}

function maybeEmitAlert(state: StreamState) {
  if (state.status !== "live") return null
  if (Math.random() < 0.8) return null

  return {
    type: "alert",
    streamId: state.id,
    severity: Math.random() < 0.6 ? "warning" : "critical",
    code: "ENGAGEMENT_SPIKE",
    message: `Audience surge detected on ${state.id}`,
    at: Date.now(),
  }
}

export async function GET(request: Request) {
  const scopedUserId = await requireStreamDashboardUserId(request)
  if (scopedUserId instanceof NextResponse) return scopedUserId

  const encoder = new TextEncoder()
  const streamIds = parseStreamIds(request)
  const stateById = createSeedStates(streamIds)

  const stream = new ReadableStream({
    start(controller) {
      const emit = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      emit({
        type: "ready",
        at: Date.now(),
        streams: Object.values(stateById),
      })

      const ticker = setInterval(() => {
        for (const state of Object.values(stateById)) {
          if (Math.random() < 0.35) {
            const nextStatus = STATUS_TRANSITIONS[state.status]
            emit({
              type: "status_transition",
              streamId: state.id,
              from: state.status,
              to: nextStatus,
              at: Date.now(),
            })
            state.status = nextStatus
          }

          const viewersDelta = Math.floor(Math.random() * 120) - 45
          state.concurrentViewers = Math.max(0, state.concurrentViewers + viewersDelta)
          emit({
            type: "viewers",
            streamId: state.id,
            concurrentViewers: state.concurrentViewers,
            at: Date.now(),
          })

          state.engagement = {
            likes: state.engagement.likes + Math.max(0, Math.floor(Math.random() * 18) - 3),
            comments: state.engagement.comments + Math.max(0, Math.floor(Math.random() * 8) - 2),
            shares: state.engagement.shares + Math.max(0, Math.floor(Math.random() * 5) - 1),
            reactions: state.engagement.reactions + Math.max(0, Math.floor(Math.random() * 12) - 2),
          }
          emit({
            type: "engagement",
            streamId: state.id,
            counters: state.engagement,
            at: Date.now(),
          })

          const alert = maybeEmitAlert(state)
          if (alert) emit(alert)
        }
      }, EVENT_INTERVAL_MS)

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }, HEARTBEAT_INTERVAL_MS)

      request.signal.addEventListener("abort", () => {
        clearInterval(ticker)
        clearInterval(heartbeat)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

export const dynamic = "force-dynamic"
