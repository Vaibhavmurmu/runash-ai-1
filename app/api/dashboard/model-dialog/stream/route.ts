import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"
import { createModelDialogRun, updateModelDialogRunStatus } from "@/lib/repositories/model-dialog-runs"
import type { ModelDialogSseEvent } from "@/lib/types/model-dialog"
import { requireDashboardSessionUserId } from "../../_auth"

const SOURCE_MODULES = new Set(["chat", "editor", "seller", "store", "streaming", "dashboard"])
const EXECUTION_MODES = new Set([
  "generic",
  "image-generation",
  "video-generation",
  "live-stream-assist",
  "previous-live-optimization",
  "live-view",
  "previous-live-view",
  "video-on-demand",
  "live-streaming",
  "stream",
  "scheduling",
] as const)

type ContextMode = "live-view" | "previous-live-view" | "video-on-demand" | "live-streaming" | "stream" | "scheduling"

type ModeContext = {
  datasetId: string
  librarySource: string
  filters: string
  snapshotTime: string
}

const querySchema = z.object({
  modelId: z.string().trim().min(1),
  input: z.string().trim().min(1),
  requestId: z.string().trim().optional(),
  sourceModule: z.string().trim().min(1).optional(),
  executionMode: z.string().trim().optional(),
  liveViewContextDatasetId: z.string().trim().optional(),
  liveViewContextLibrarySource: z.string().trim().optional(),
  liveViewContextFilters: z.string().trim().optional(),
  liveViewContextSnapshotTime: z.string().trim().optional(),
  previousLiveViewContextDatasetId: z.string().trim().optional(),
  previousLiveViewContextLibrarySource: z.string().trim().optional(),
  previousLiveViewContextFilters: z.string().trim().optional(),
  previousLiveViewContextSnapshotTime: z.string().trim().optional(),
  videoOnDemandContextDatasetId: z.string().trim().optional(),
  videoOnDemandContextLibrarySource: z.string().trim().optional(),
  videoOnDemandContextFilters: z.string().trim().optional(),
  videoOnDemandContextSnapshotTime: z.string().trim().optional(),
  liveStreamingContextDatasetId: z.string().trim().optional(),
  liveStreamingContextLibrarySource: z.string().trim().optional(),
  liveStreamingContextFilters: z.string().trim().optional(),
  liveStreamingContextSnapshotTime: z.string().trim().optional(),
  streamContextDatasetId: z.string().trim().optional(),
  streamContextLibrarySource: z.string().trim().optional(),
  streamContextFilters: z.string().trim().optional(),
  streamContextSnapshotTime: z.string().trim().optional(),
  schedulingContextDatasetId: z.string().trim().optional(),
  schedulingContextLibrarySource: z.string().trim().optional(),
  schedulingContextFilters: z.string().trim().optional(),
  schedulingContextSnapshotTime: z.string().trim().optional(),
})

function readModeContext(mode: ContextMode, query: z.infer<typeof querySchema>): ModeContext {
  if (mode === "live-view") {
    return {
      datasetId: query.liveViewContextDatasetId ?? "",
      librarySource: query.liveViewContextLibrarySource ?? "",
      filters: query.liveViewContextFilters ?? "",
      snapshotTime: query.liveViewContextSnapshotTime ?? "",
    }
  }

  if (mode === "previous-live-view") {
    return {
      datasetId: query.previousLiveViewContextDatasetId ?? "",
      librarySource: query.previousLiveViewContextLibrarySource ?? "",
      filters: query.previousLiveViewContextFilters ?? "",
      snapshotTime: query.previousLiveViewContextSnapshotTime ?? "",
    }
  }

  if (mode === "video-on-demand") {
    return {
      datasetId: query.videoOnDemandContextDatasetId ?? "",
      librarySource: query.videoOnDemandContextLibrarySource ?? "",
      filters: query.videoOnDemandContextFilters ?? "",
      snapshotTime: query.videoOnDemandContextSnapshotTime ?? "",
    }
  }

  if (mode === "live-streaming") {
    return {
      datasetId: query.liveStreamingContextDatasetId ?? "",
      librarySource: query.liveStreamingContextLibrarySource ?? "",
      filters: query.liveStreamingContextFilters ?? "",
      snapshotTime: query.liveStreamingContextSnapshotTime ?? "",
    }
  }

  if (mode === "stream") {
    return {
      datasetId: query.streamContextDatasetId ?? "",
      librarySource: query.streamContextLibrarySource ?? "",
      filters: query.streamContextFilters ?? "",
      snapshotTime: query.streamContextSnapshotTime ?? "",
    }
  }

  return {
    datasetId: query.schedulingContextDatasetId ?? "",
    librarySource: query.schedulingContextLibrarySource ?? "",
    filters: query.schedulingContextFilters ?? "",
    snapshotTime: query.schedulingContextSnapshotTime ?? "",
  }
}

function requiredFieldsForMode(mode: ContextMode): Array<keyof ModeContext> {
  if (mode === "live-view") return ["datasetId", "librarySource"]
  if (mode === "previous-live-view") return ["datasetId", "snapshotTime"]
  if (mode === "video-on-demand") return ["datasetId", "filters"]
  if (mode === "live-streaming") return ["datasetId", "librarySource"]
  if (mode === "stream") return ["datasetId", "librarySource"]
  return ["datasetId", "snapshotTime"]
}

function toSse(event: string, payload: ModelDialogSseEvent) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function buildEvent(
  requestId: string,
  state: ModelDialogSseEvent["state"],
  message: string,
  elapsedMs: number,
  chunk?: string,
  errorCode?: ModelDialogSseEvent["errorCode"],
  errorMessage?: string,
): ModelDialogSseEvent {
  return {
    requestId,
    state,
    message,
    chunk,
    elapsedMs,
    timestamp: new Date().toISOString(),
    ...(errorCode ? { errorCode } : {}),
    ...(errorMessage ? { errorMessage } : {}),
  }
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request)

  try {
    const userId = await requireDashboardSessionUserId(request)
    if (userId instanceof Response) {
      return userId
    }

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
    if (!parsed.success) {
      return NextResponse.json(
        {
          requestId,
          status: "failed",
          output: null,
          error: {
            code: "MODEL_DIALOG_INVALID_STREAM_REQUEST",
            message: "Invalid model dialog stream query.",
          },
        },
        { status: 400 },
      )
    }

    const streamRequestId = parsed.data.requestId || requestId
    const sourceModule = SOURCE_MODULES.has(parsed.data.sourceModule || "")
      ? (parsed.data.sourceModule as "chat" | "editor" | "seller" | "store" | "streaming" | "dashboard")
      : "dashboard"
    const executionMode = EXECUTION_MODES.has((parsed.data.executionMode ?? "") as never)
      ? (parsed.data.executionMode as z.infer<typeof querySchema>["executionMode"])
      : "generic"

    const contextualMode =
      executionMode === "live-view" ||
      executionMode === "previous-live-view" ||
      executionMode === "video-on-demand" ||
      executionMode === "live-streaming" ||
      executionMode === "stream" ||
      executionMode === "scheduling"
        ? executionMode
        : null

    if (contextualMode) {
      const modeContext = readModeContext(contextualMode, parsed.data)
      const missingFields = requiredFieldsForMode(contextualMode).filter((field) => !modeContext[field]?.trim())

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            requestId,
            status: "failed",
            output: null,
            errorCode: "MODEL_DIALOG_INVALID_PROMPT_INPUT",
            errorMessage: `Missing required context fields for ${contextualMode}: ${missingFields.join(", ")}.`,
            error: {
              code: "MODEL_DIALOG_INVALID_PROMPT_INPUT",
              message: `Missing required context fields for ${contextualMode}: ${missingFields.join(", ")}.`,
            },
            diagnostics: {
              provider: "RunAsh AI",
              modelId: parsed.data.modelId,
              sourceModule,
              executionMode,
            },
          },
          { status: 422 },
        )
      }
    }

    const runId = await createModelDialogRun({
      requestId: streamRequestId,
      userId,
      modelId: parsed.data.modelId,
      sourceModule,
      input: parsed.data.input,
      status: "queued",
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const startedAt = Date.now()
        const chunks = [
          `Analyzing prompt context for mode ${executionMode}...`,
          `Input length: ${parsed.data.input.length} characters.`,
          contextualMode
            ? `Using dataset/library context for ${contextualMode} execution.`
            : "Generating candidate output...",
        ]

        const emit = (event: string, payload: ModelDialogSseEvent) => {
          controller.enqueue(encoder.encode(toSse(event, payload)))
        }

        emit("queued", buildEvent(streamRequestId, "queued", "Request queued for model execution.", 0))

        const timers: Array<ReturnType<typeof setTimeout>> = []
        timers.push(
          setTimeout(() => {
            void updateModelDialogRunStatus(runId, "running")
            emit(
              "running",
              buildEvent(streamRequestId, "running", `Running model ${parsed.data.modelId}.`, Date.now() - startedAt),
            )
          }, 350),
        )

        chunks.forEach((chunk, index) => {
          timers.push(
            setTimeout(() => {
              void updateModelDialogRunStatus(runId, "partial-output")
              emit(
                "partial",
                buildEvent(streamRequestId, "partial-output", "Received partial output chunk.", Date.now() - startedAt, chunk),
              )
            }, 800 + index * 600),
          )
        })

        timers.push(
          setTimeout(() => {
            void updateModelDialogRunStatus(runId, "completed")
            emit(
              "completed",
              buildEvent(streamRequestId, "completed", "Model execution completed.", Date.now() - startedAt),
            )
            controller.close()
          }, 2800),
        )

        request.signal.addEventListener("abort", () => {
          timers.forEach((timer) => clearTimeout(timer))
          void updateModelDialogRunStatus(runId, "failed")
          emit(
            "failed",
            buildEvent(
              streamRequestId,
              "failed",
              "Model execution failed before completion.",
              Date.now() - startedAt,
              undefined,
              "MODEL_DIALOG_EXECUTION_FAILED",
              "Model execution failed before completion.",
            ),
          )
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    logApiEvent("error", "dashboard.model_dialog.stream.failed", {
      requestId,
      route: "/api/dashboard/model-dialog/stream",
      method: request.method,
      details: { operation: "dashboard-model-dialog-stream", code: "MODEL_DIALOG_STREAM_INTERNAL_ERROR" },
      error,
    })

    return NextResponse.json(
      {
        requestId,
        status: "failed",
        output: null,
        error: {
          code: "MODEL_DIALOG_STREAM_INTERNAL_ERROR",
          message: "Unable to stream model dialog request.",
        },
      },
      { status: 500 },
    )
  }
}
