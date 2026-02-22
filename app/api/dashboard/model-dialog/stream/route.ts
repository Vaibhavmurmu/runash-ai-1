import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"
import type { ModelDialogSseEvent } from "@/lib/types/model-dialog"
import { requireDashboardSessionUserId } from "../../_auth"

const querySchema = z.object({
  modelId: z.string().trim().min(1),
  input: z.string().trim().min(1),
  requestId: z.string().trim().optional(),
})

function toSse(event: string, payload: ModelDialogSseEvent) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function buildEvent(
  requestId: string,
  state: ModelDialogSseEvent["state"],
  message: string,
  elapsedMs: number,
  chunk?: string,
): ModelDialogSseEvent {
  return {
    requestId,
    state,
    message,
    chunk,
    elapsedMs,
    timestamp: new Date().toISOString(),
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
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const startedAt = Date.now()
        const chunks = [
          "Analyzing prompt context...",
          `Input length: ${parsed.data.input.length} characters.`,
          "Generating candidate output...",
        ]

        const emit = (event: string, payload: ModelDialogSseEvent) => {
          controller.enqueue(encoder.encode(toSse(event, payload)))
        }

        emit("queued", buildEvent(streamRequestId, "queued", "Request queued for model execution.", 0))

        const timers: Array<ReturnType<typeof setTimeout>> = []
        timers.push(
          setTimeout(() => {
            emit(
              "running",
              buildEvent(streamRequestId, "running", `Running model ${parsed.data.modelId}.`, Date.now() - startedAt),
            )
          }, 350),
        )

        chunks.forEach((chunk, index) => {
          timers.push(
            setTimeout(() => {
              emit(
                "partial",
                buildEvent(streamRequestId, "partial-output", "Received partial output chunk.", Date.now() - startedAt, chunk),
              )
            }, 800 + index * 600),
          )
        })

        timers.push(
          setTimeout(() => {
            emit(
              "completed",
              buildEvent(streamRequestId, "completed", "Model execution completed.", Date.now() - startedAt),
            )
            controller.close()
          }, 2800),
        )

        request.signal.addEventListener("abort", () => {
          timers.forEach((timer) => clearTimeout(timer))
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
