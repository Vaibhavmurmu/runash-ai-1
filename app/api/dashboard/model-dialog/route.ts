import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"
import { requireDashboardSessionUserId } from "../_auth"

const modelDialogRequestSchema = z.object({
  modelId: z.string().trim().min(1, "modelId is required"),
  mode: z.enum(["sync", "async"]),
  input: z.string().trim().min(1, "input is required"),
  context: z.record(z.string(), z.unknown()).default({}),
})

type ModelDialogError = {
  code: string
  message: string
}

function buildResponse(requestId: string, status: "completed" | "accepted" | "failed", output: unknown, error: ModelDialogError | null) {
  return {
    requestId,
    status,
    output,
    error,
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)

  try {
    const userId = await requireDashboardSessionUserId(request)
    if (userId instanceof Response) return userId

    const body = await request.json().catch(() => null)
    const parsed = modelDialogRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        buildResponse(requestId, "failed", null, {
          code: "MODEL_DIALOG_INVALID_REQUEST",
          message: "Invalid model dialog request payload.",
        }),
        { status: 400 },
      )
    }

    const { modelId, mode, input, context } = parsed.data

    if (mode === "async") {
      const token = `mdl_${requestId.replace(/-/g, "")}`
      return NextResponse.json(buildResponse(requestId, "accepted", { token, modelId, context }, null), { status: 202 })
    }

    const output = {
      modelId,
      mode,
      content: `Processed input (${input.length} chars) for model ${modelId}.`,
      context,
    }

    return NextResponse.json(buildResponse(requestId, "completed", output, null), { status: 200 })
  } catch (error) {
    logApiEvent("error", "dashboard.model_dialog.failed", {
      requestId,
      route: "/api/dashboard/model-dialog",
      method: request.method,
      details: { operation: "dashboard-model-dialog", code: "MODEL_DIALOG_INTERNAL_ERROR" },
      error,
    })

    return NextResponse.json(
      buildResponse(requestId, "failed", null, {
        code: "MODEL_DIALOG_INTERNAL_ERROR",
        message: "Unable to process model dialog request.",
      }),
      { status: 500 },
    )
  }
}
