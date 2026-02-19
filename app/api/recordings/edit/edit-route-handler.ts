import { z } from "zod"

export const recordingEditInputSchema = z
  .object({
    originalId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(160),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    filters: z.record(z.string(), z.unknown()).default({}),
    audioLevel: z.number().finite().min(0).max(2),
    exportSettings: z.record(z.string(), z.unknown()).default({}),
  })
  .strict()
  .superRefine((value, ctx) => {
    const startMs = Date.parse(value.startTime)
    const endMs = Date.parse(value.endTime)

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be after startTime",
      })
      return
    }

    const maxDurationMs = 12 * 60 * 60 * 1000
    if (endMs - startMs > maxDurationMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Edit range must not exceed 12 hours",
      })
    }
  })

export type RecordingEditInput = z.infer<typeof recordingEditInputSchema>

export type RecordingEditSuccessResponse = {
  success: true
  editId: string
  message: string
}

export type RecordingEditErrorResponse = {
  success: false
  error: string
  details?: string[]
}

export type RecordingEditResponse = RecordingEditSuccessResponse | RecordingEditErrorResponse

type AuthSession = {
  user?: {
    id?: string
  }
} | null

type SqlExecutor = (parts: TemplateStringsArray, ...values: unknown[]) => Promise<{ id: string }[]>

type RecordingEditDependencies = {
  getSession: () => Promise<AuthSession>
  transaction: <T>(run: (tx: SqlExecutor) => Promise<T>) => Promise<T>
}

const BAD_REQUEST_ERROR = "Invalid recording edit payload"

export async function handleCreateRecordingEdit(
  request: Request,
  dependencies: RecordingEditDependencies,
): Promise<Response> {
  const session = await dependencies.getSession()
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" } satisfies RecordingEditErrorResponse, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json(
      { success: false, error: BAD_REQUEST_ERROR, details: ["Request body must be valid JSON"] } satisfies RecordingEditErrorResponse,
      { status: 400 },
    )
  }

  const parsed = recordingEditInputSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: BAD_REQUEST_ERROR,
        details: parsed.error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`),
      } satisfies RecordingEditErrorResponse,
      { status: 400 },
    )
  }

  const editedVideo = parsed.data

  try {
    const editId = await dependencies.transaction(async (tx) => {
      const result = await tx`
        INSERT INTO recording_edits (
          user_id,
          original_stream_id,
          title,
          status,
          start_time,
          end_time,
          filters,
          audio_level,
          export_settings
        ) VALUES (
          ${session.user!.id},
          ${editedVideo.originalId},
          ${editedVideo.title},
          'processing',
          ${editedVideo.startTime},
          ${editedVideo.endTime},
          ${JSON.stringify(editedVideo.filters)}::jsonb,
          ${editedVideo.audioLevel},
          ${JSON.stringify(editedVideo.exportSettings)}::jsonb
        )
        RETURNING id
      `

      return result[0].id
    })

    return Response.json({
      success: true,
      editId,
      message: "Video edit queued for processing",
    } satisfies RecordingEditSuccessResponse)
  } catch {
    return Response.json({ success: false, error: "Failed to save edited video" } satisfies RecordingEditErrorResponse, {
      status: 500,
    })
  }
}
