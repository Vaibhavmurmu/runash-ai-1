import type { EditorAsset, EditorSegment, EditorTimeline, EditorTrack } from "@/lib/editor/domain"
import type { VideoGenerationRequest } from "@/lib/editor/video-models/types"

const EPSILON_SECONDS = 1e-6
const DEFAULT_FPS = 30

export interface TimelineCompilationIssue {
  code:
    | "TIMING_INVALID"
    | "OUT_OF_BOUNDS"
    | "OVERLAP_UNSUPPORTED"
    | "GAP_UNSUPPORTED"
    | "TRACK_NOT_FOUND"
    | "ASSET_NOT_FOUND"
  message: string
  segmentId?: string
  trackId?: string
  assetId?: string
  startSeconds?: number
  endSeconds?: number
}

export class TimelineCompilationError extends Error {
  readonly code: string
  readonly issues: TimelineCompilationIssue[]

  constructor(message: string, code = "TIMELINE_INVALID", issues: TimelineCompilationIssue[] = []) {
    super(message)
    this.name = "TimelineCompilationError"
    this.code = code
    this.issues = issues
  }
}

export interface CompiledTimelineShot {
  segmentId: string
  trackId: string
  trackLabel: string
  trackType: string
  label: string
  segmentType: string
  startSeconds: number
  endSeconds: number
  durationSeconds: number
  assetId: string | null
}

export interface CompiledTimelineAssetReference {
  assetId: string
  storageKey: string
  source: EditorAsset["source"]
  mimeType: string
  accessUrl: string | null
}

export interface CompiledSegmentPromptContext {
  segmentId: string
  prompt: string | null
  negativePrompt: string | null
  context: string[]
}

export interface CompileTimelineResult {
  request: VideoGenerationRequest
  summary: {
    timelineId: string
    timelineName: string
    fps: number
    totalDurationSeconds: number
    shotCount: number
    sourceAssetCount: number
  }
  totalDurationSeconds: number
  shotList: CompiledTimelineShot[]
  sourceAssets: CompiledTimelineAssetReference[]
  segmentPromptContext: CompiledSegmentPromptContext[]
}

interface CompileTimelineInput {
  timeline: EditorTimeline
  assets: EditorAsset[]
  payload: VideoGenerationRequest
}

interface NormalizedShot {
  shot: CompiledTimelineShot
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1"
}

function normalizeToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps) / fps
}

function normalizeFps(requested: number | undefined, timelineFps: number | undefined): number {
  const source = Number.isFinite(requested) ? Number(requested) : Number(timelineFps)
  const safe = Number.isFinite(source) && source > 0 ? Math.round(source) : DEFAULT_FPS

  return Math.min(120, Math.max(1, safe))
}

function normalizeSegment(
  segment: EditorSegment,
  track: EditorTrack,
  timeline: EditorTimeline,
  fps: number,
  issues: TimelineCompilationIssue[],
): NormalizedShot | null {
  const startSeconds = normalizeToFrame(segment.startSeconds, fps)
  const endSeconds = normalizeToFrame(segment.endSeconds, fps)

  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
    issues.push({
      code: "TIMING_INVALID",
      message: `Segment ${segment.id} has invalid timing values`,
      segmentId: segment.id,
      trackId: segment.trackId,
    })
    return null
  }

  if (startSeconds < 0 || endSeconds <= startSeconds) {
    issues.push({
      code: "TIMING_INVALID",
      message: `Segment ${segment.id} has non-positive duration`,
      segmentId: segment.id,
      trackId: segment.trackId,
      startSeconds,
      endSeconds,
    })
    return null
  }

  const timelineDuration = Number.isFinite(timeline.durationSeconds) ? Math.max(0, timeline.durationSeconds) : 0
  if (timelineDuration > 0 && endSeconds > timelineDuration + EPSILON_SECONDS) {
    issues.push({
      code: "OUT_OF_BOUNDS",
      message: `Segment ${segment.id} extends beyond timeline duration`,
      segmentId: segment.id,
      trackId: segment.trackId,
      startSeconds,
      endSeconds,
    })
  }

  return {
    shot: {
      segmentId: segment.id,
      trackId: track.id,
      trackLabel: track.label,
      trackType: track.trackType,
      label: segment.label,
      segmentType: segment.segmentType,
      assetId: segment.assetId,
      startSeconds,
      endSeconds,
      durationSeconds: normalizeToFrame(endSeconds - startSeconds, fps),
    },
  }
}

function validateTrackContinuity(track: EditorTrack, shots: CompiledTimelineShot[], timeline: EditorTimeline, issues: TimelineCompilationIssue[]) {
  const allowOverlaps = asBoolean(track.metadata.allowOverlaps) || asBoolean(timeline.metadata.allowOverlaps)
  const allowGaps = asBoolean(track.metadata.allowGaps) || asBoolean(timeline.metadata.allowGaps)

  let previousEnd: number | null = null
  for (const shot of shots) {
    if (previousEnd !== null) {
      if (!allowOverlaps && shot.startSeconds < previousEnd - EPSILON_SECONDS) {
        issues.push({
          code: "OVERLAP_UNSUPPORTED",
          message: `Track ${track.id} has overlapping segments around ${shot.segmentId}`,
          segmentId: shot.segmentId,
          trackId: track.id,
          startSeconds: shot.startSeconds,
          endSeconds: shot.endSeconds,
        })
      }

      if (!allowGaps && shot.startSeconds > previousEnd + EPSILON_SECONDS) {
        issues.push({
          code: "GAP_UNSUPPORTED",
          message: `Track ${track.id} has unsupported gap before ${shot.segmentId}`,
          segmentId: shot.segmentId,
          trackId: track.id,
          startSeconds: shot.startSeconds,
        })
      }
    }

    previousEnd = Math.max(previousEnd ?? 0, shot.endSeconds)
  }
}

function readPrompt(metadata: Record<string, unknown>, key: "prompt" | "negativePrompt"): string | null {
  const value = metadata[key]
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function readContext(metadata: Record<string, unknown>): string[] {
  const keys = ["context", "keywords", "notes", "style"]
  const values = keys.flatMap((key) => {
    const value = metadata[key]
    if (typeof value === "string") return [value]
    if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string") as string[]
    return []
  })

  return values.map((entry) => entry.trim()).filter(Boolean)
}

export function compileTimelineToVideoGenerationRequest(input: CompileTimelineInput): CompileTimelineResult {
  const fps = normalizeFps(input.payload.fps, input.timeline.frameRate)
  const tracks = [...input.timeline.tracks].sort((a, b) => a.orderIndex - b.orderIndex)

  const issues: TimelineCompilationIssue[] = []
  const tracksById = new Map(tracks.map((track) => [track.id, track]))

  for (const segment of input.timeline.segments) {
    if (!tracksById.has(segment.trackId)) {
      issues.push({
        code: "TRACK_NOT_FOUND",
        message: `Segment ${segment.id} references unknown track ${segment.trackId}`,
        segmentId: segment.id,
        trackId: segment.trackId,
      })
    }
  }

  const shotList: CompiledTimelineShot[] = []
  for (const track of tracks) {
    const trackSegments = input.timeline.segments
      .filter((segment) => segment.trackId === track.id)
      .sort((a, b) => a.startSeconds - b.startSeconds)

    const trackShots: CompiledTimelineShot[] = []
    for (const segment of trackSegments) {
      const normalized = normalizeSegment(segment, track, input.timeline, fps, issues)
      if (normalized) {
        trackShots.push(normalized.shot)
      }
    }

    validateTrackContinuity(track, trackShots, input.timeline, issues)
    shotList.push(...trackShots)
  }

  shotList.sort((a, b) => a.startSeconds - b.startSeconds || a.trackId.localeCompare(b.trackId))

  const segmentPromptContext: CompiledSegmentPromptContext[] = input.timeline.segments.map((segment) => ({
    segmentId: segment.id,
    prompt: readPrompt(segment.metadata, "prompt"),
    negativePrompt: readPrompt(segment.metadata, "negativePrompt"),
    context: readContext(segment.metadata),
  }))

  const referencedAssetIds = new Set(shotList.map((shot) => shot.assetId).filter((id): id is string => Boolean(id)))
  const assetById = new Map(input.assets.map((asset) => [asset.id, asset]))
  for (const assetId of referencedAssetIds) {
    if (!assetById.has(assetId)) {
      issues.push({
        code: "ASSET_NOT_FOUND",
        message: `Timeline references missing asset ${assetId}`,
        assetId,
      })
    }
  }

  if (issues.length > 0) {
    throw new TimelineCompilationError("Unable to compile timeline", "TIMELINE_VALIDATION_FAILED", issues)
  }

  const sourceAssets = input.assets
    .filter((asset) => referencedAssetIds.has(asset.id))
    .map((asset) => ({
      assetId: asset.id,
      storageKey: asset.storageKey,
      source: asset.source,
      mimeType: asset.mimeType,
      accessUrl: asset.accessUrl,
    }))

  const timelineDuration = normalizeToFrame(Math.max(0, input.timeline.durationSeconds || 0), fps)
  const shotDuration = shotList.reduce((max, shot) => Math.max(max, shot.endSeconds), 0)
  const requestedDuration = typeof input.payload.durationSeconds === "number" ? normalizeToFrame(input.payload.durationSeconds, fps) : null
  const totalDurationSeconds = requestedDuration ?? Math.max(timelineDuration, shotDuration)

  const derivedPrompts = segmentPromptContext
    .flatMap((entry) => [entry.prompt, ...entry.context])
    .filter((value): value is string => Boolean(value))
  const mergedPrompt = input.payload.prompt?.trim() || derivedPrompts.join(" | ")
  const mergedNegativePrompt =
    input.payload.negativePrompt?.trim() ||
    segmentPromptContext
      .map((entry) => entry.negativePrompt)
      .filter((value): value is string => Boolean(value))
      .join(" | ")

  const request: VideoGenerationRequest = {
    ...input.payload,
    fps,
    durationSeconds: totalDurationSeconds,
    prompt: mergedPrompt || undefined,
    negativePrompt: mergedNegativePrompt || undefined,
    timeline: {
      id: input.timeline.id,
      name: input.timeline.name,
      totalDurationSeconds,
      shotList,
      sourceAssets,
      segmentPromptContext,
    },
  }

  return {
    request,
    summary: {
      timelineId: input.timeline.id,
      timelineName: input.timeline.name,
      fps,
      totalDurationSeconds,
      shotCount: shotList.length,
      sourceAssetCount: sourceAssets.length,
    },
    totalDurationSeconds,
    shotList,
    sourceAssets,
    segmentPromptContext,
  }
}
