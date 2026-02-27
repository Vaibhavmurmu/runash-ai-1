import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"
import { createModelDialogRun, updateModelDialogRunStatus } from "@/lib/repositories/model-dialog-runs"
import { requireDashboardSessionUserId } from "../_auth"

const sourceModuleSchema = z.enum(["chat", "editor", "seller", "store", "streaming", "dashboard"])

const modelDialogRequestSchema = z.object({
  modelId: z.string().trim().min(1, "modelId is required"),
  mode: z.enum(["sync", "async"]),
  input: z.string().trim().min(1, "input is required"),
  sourceModule: sourceModuleSchema.optional().default("dashboard"),
  context: z.record(z.string(), z.unknown()).default({}),
})

type ModelDialogResponseEnvelope = {
  requestId: string
  status: "completed" | "accepted" | "failed"
  output: unknown
  error: { code: ModelDialogErrorCode; message: string } | null
}

type ModelDialogErrorCode =
  | "USAGE_LIMIT_REACHED"
  | "PLAN_UPGRADE_REQUIRED"
  | "RATE_LIMITED"
  | "MODEL_DIALOG_INVALID_REQUEST"
  | "MODEL_DIALOG_INTERNAL_ERROR"

type ModelDialogPolicyError = {
  code: Extract<ModelDialogErrorCode, "USAGE_LIMIT_REACHED" | "PLAN_UPGRADE_REQUIRED" | "RATE_LIMITED">
  message: string
  status: number
}

function resolvePolicyError(context: Record<string, unknown>): ModelDialogPolicyError | null {
  if (context.usageLimitReached === true) {
    return {
      code: "USAGE_LIMIT_REACHED",
      message: "You have reached your current model usage limit.",
      status: 429,
    }
  }

  if (context.planUpgradeRequired === true) {
    return {
      code: "PLAN_UPGRADE_REQUIRED",
      message: "Your current plan does not include this model capability.",
      status: 403,
    }
  }

  if (context.rateLimited === true) {
    return {
      code: "RATE_LIMITED",
      message: "Model dialog requests are temporarily rate limited. Please retry shortly.",
      status: 429,
    }
  }

  return null
}

function buildResponse(envelope: ModelDialogResponseEnvelope) {
  return envelope
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
        buildResponse({
          requestId,
          status: "failed",
          output: null,
          error: {
            code: "MODEL_DIALOG_INVALID_REQUEST",
            message: "Invalid model dialog request payload.",
          },
        }),
        { status: 400 },
      )
    }

    const { modelId, mode, input, context, sourceModule } = parsed.data

    const policyError = resolvePolicyError(context)
    if (policyError) {
      return NextResponse.json(
        buildResponse({
          requestId,
          status: "failed",
          output: null,
          error: {
            code: policyError.code,
            message: policyError.message,
          },
        }),
        { status: policyError.status },
      )
    }

    const runId = await createModelDialogRun({
      requestId,
      userId,
      modelId,
      sourceModule,
      input,
      status: mode === "async" ? "queued" : "running",
    })

    if (mode === "async") {
      return NextResponse.json(
        buildResponse({
          requestId,
          status: "accepted",
          output: { token: `mdl_${runId.replace(/-/g, "")}`, modelId, context, runId },
          error: null,
        }),
        { status: 202 },
      )
    }

    const output = {
      runId,
      modelId,
      mode,
      content: `Processed input (${input.length} chars) for model ${modelId}.`,
      context,
    }

    await updateModelDialogRunStatus(runId, "completed")

    return NextResponse.json(
      buildResponse({
        requestId,
        status: "completed",
        output,
        error: null,
      }),
      { status: 200 },
    )
  } catch (error) {
    logApiEvent("error", "dashboard.model_dialog.failed", {
      requestId,
      route: "/api/dashboard/model-dialog",
      method: request.method,
      details: { operation: "dashboard-model-dialog", code: "MODEL_DIALOG_INTERNAL_ERROR" },
      error,
    })

    return NextResponse.json(
      buildResponse({
        requestId,
        status: "failed",
        output: null,
        error: {
          code: "MODEL_DIALOG_INTERNAL_ERROR",
          message: "Unable to process model dialog request.",
        },
      }),
      { status: 500 },
    )
  }
}
