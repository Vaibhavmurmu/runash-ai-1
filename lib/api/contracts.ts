import { z } from "zod"

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
})

export const apiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: apiErrorSchema,
  requestId: z.string().min(1),
})

export type ApiContractError = z.infer<typeof apiErrorSchema>
export type ApiContractErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>

export const liveStreamCreateRequestSchema = z.object({
  workspaceId: z.string().trim().max(128).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  dvrEnabled: z.boolean().optional(),
  latencyProfile: z.enum(["ultra_low", "low", "standard"] as const).optional(),
})

export const editorProjectTimelineCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  frameRate: z.number().int().positive().max(240).optional(),
  durationSeconds: z.number().positive().max(60 * 60).optional(),
  activate: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  version: z.number().int().nonnegative().optional(),
})

const editorTrackSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  trackType: z.string().trim().min(1).max(64).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const editorSegmentSchema = z.object({
  id: z.string().trim().min(1).max(120),
  trackId: z.string().trim().min(1).max(120),
  assetId: z.string().trim().min(1).max(120).nullable().optional(),
  label: z.string().trim().min(1).max(120).optional(),
  segmentType: z.string().trim().min(1).max(64).optional(),
  startSeconds: z.number().nonnegative().optional(),
  endSeconds: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const editorProjectTimelineReplaceRequestSchema = z.object({
  timeline: z.object({
    id: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120).optional(),
    frameRate: z.number().int().positive().max(240).optional(),
    durationSeconds: z.number().positive().max(60 * 60).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tracks: z.array(editorTrackSchema).optional(),
    segments: z.array(editorSegmentSchema).optional(),
  }),
  version: z.number().int().nonnegative().optional(),
})

export const editorRenderJobCreateRequestSchema = z.object({
  projectId: z.string().trim().min(1).max(120),
  payload: z.unknown().optional(),
})

export const editorAssetCreateRequestSchema = z.object({
  source: z.enum(["upload", "storage"] as const).optional(),
  uploadFileId: z.string().trim().min(1).max(255).nullable().optional(),
  storageKey: z.string().trim().min(1).max(512),
  accessUrl: z.string().trim().url().max(2048).nullable().optional(),
  mimeType: z.string().trim().min(1).max(128).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const editorSegmentCreateRequestSchema = z.object({
  timelineId: z.string().trim().min(1).max(120),
  trackId: z.string().trim().min(1).max(120),
  assetId: z.string().trim().min(1).max(120).nullable().optional(),
  label: z.string().trim().min(1).max(120).optional(),
  segmentType: z.string().trim().min(1).max(64).optional(),
  startSeconds: z.number().nonnegative().optional(),
  endSeconds: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  version: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
})

export function buildInvalidRequestError(error: z.ZodError, message = "Invalid request body") {
  return {
    error: message,
    code: "INVALID_REQUEST",
    details: { issues: formatZodIssues(error) },
  }
}

export const mediaAssetsQuerySchema = z.object({
  projectId: z.string().trim().min(1).max(120).optional(),
})

export const mediaUploadInitRequestSchema = z.object({
  mimeType: z.string().trim().min(1).max(128).default("application/octet-stream"),
  sizeBytes: z.number().positive(),
  fileName: z.string().trim().min(1).max(255).default("media.bin"),
  projectId: z.string().trim().min(1).max(120).nullable().optional(),
})

export const mediaUploadFinalizeRequestSchema = z.object({
  durationSeconds: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  codecVideo: z.string().trim().min(1).max(64).optional(),
  codecAudio: z.string().trim().min(1).max(64).optional(),
  frameRate: z.number().positive().optional(),
  channels: z.number().int().positive().optional(),
  sampleRate: z.number().int().positive().optional(),
})

export function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }))
}
