import type { EditorSegment } from "@/lib/editor/domain"

const DEFAULT_IMAGE_DURATION_SECONDS = 3

export type DurationStrategy = "video_metadata" | "image_fallback" | "video_fallback"

export interface ResolveMediaDurationInput {
  isVideoAsset: boolean
  metadataDurations?: Array<unknown>
  imageFallbackSeconds?: number
  videoFallbackSeconds?: number
}

export interface ResolveMediaDurationResult {
  durationSeconds: number
  durationStrategy: DurationStrategy
}

export interface ResolveInsertionPlacementInput {
  segments: EditorSegment[]
  trackId: string
  durationSeconds: number
  playheadSeconds: number | null
  allowOverlaps: boolean
}

export interface ResolveInsertionPlacementResult {
  insertionStartSeconds: number
  insertionEndSeconds: number
  insertionSource: "playhead" | "track_end"
}

function toPositiveSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function normalizePlayhead(playheadSeconds: number | null): number | null {
  if (playheadSeconds === null) return null
  if (!Number.isFinite(playheadSeconds) || playheadSeconds < 0) return null
  return playheadSeconds
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB
}

export function readOverlapModeEnabled(metadata: Record<string, unknown> | null | undefined): boolean {
  const value = metadata?.allowOverlaps
  return value === true || value === "true" || value === 1 || value === "1"
}

export function resolveMediaInsertionDuration(input: ResolveMediaDurationInput): ResolveMediaDurationResult {
  const imageFallbackSeconds = input.imageFallbackSeconds ?? DEFAULT_IMAGE_DURATION_SECONDS
  const videoFallbackSeconds = input.videoFallbackSeconds ?? imageFallbackSeconds

  if (input.isVideoAsset) {
    const metadataDuration = (input.metadataDurations ?? []).map((value) => toPositiveSeconds(value)).find((value) => value !== null)
    if (metadataDuration !== undefined && metadataDuration !== null) {
      return {
        durationSeconds: metadataDuration,
        durationStrategy: "video_metadata",
      }
    }

    return {
      durationSeconds: videoFallbackSeconds,
      durationStrategy: "video_fallback",
    }
  }

  return {
    durationSeconds: imageFallbackSeconds,
    durationStrategy: "image_fallback",
  }
}

export function resolveMediaInsertionPlacement(input: ResolveInsertionPlacementInput): ResolveInsertionPlacementResult {
  const segmentsOnTrack = input.segments.filter((segment) => segment.trackId === input.trackId)
  const latestSegmentEndSeconds = segmentsOnTrack.reduce((latest, segment) => {
    const safeEndSeconds = Number.isFinite(segment.endSeconds) ? Math.max(0, segment.endSeconds) : 0
    return Math.max(latest, safeEndSeconds)
  }, 0)

  const safeDuration = toPositiveSeconds(input.durationSeconds) ?? DEFAULT_IMAGE_DURATION_SECONDS
  const playheadSeconds = normalizePlayhead(input.playheadSeconds)

  if (playheadSeconds === null) {
    return {
      insertionStartSeconds: latestSegmentEndSeconds,
      insertionEndSeconds: latestSegmentEndSeconds + safeDuration,
      insertionSource: "track_end",
    }
  }

  const playheadEndSeconds = playheadSeconds + safeDuration
  const hasOverlapAtPlayhead = segmentsOnTrack.some((segment) =>
    rangesOverlap(playheadSeconds, playheadEndSeconds, Math.max(0, segment.startSeconds), Math.max(0, segment.endSeconds)),
  )

  if (!input.allowOverlaps && hasOverlapAtPlayhead) {
    return {
      insertionStartSeconds: latestSegmentEndSeconds,
      insertionEndSeconds: latestSegmentEndSeconds + safeDuration,
      insertionSource: "track_end",
    }
  }

  return {
    insertionStartSeconds: playheadSeconds,
    insertionEndSeconds: playheadEndSeconds,
    insertionSource: "playhead",
  }
}
