import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { resolveRequestId } from "@/lib/api/response"
import { createActionAuditRecord } from "@/lib/repositories/agent-orchestration"
import { AgentOrchestrationService } from "@/services/agent-orchestration-service"
import { resolveActionDecision } from "./actions-handler"

const actionSchema = z.object({
  sessionId: z.string().trim().min(1),
  actionType: z.string().trim().min(1),
  actionPayload: z.record(z.unknown()).default({}),
  confirmedByUser: z.boolean().default(false),
})

const AGENT_CHAT_ENABLED = process.env.RUNASH_AGENT_CHAT_ENABLED !== "false"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)

  if (!AGENT_CHAT_ENABLED) {
    return NextResponse.json({ error: "Agent APIs disabled", requestId }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = actionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action payload", details: parsed.error.flatten(), requestId }, { status: 400 })
  }

  const { actionType, actionPayload, confirmedByUser, sessionId } = parsed.data
  const requiresConfirmation = AgentOrchestrationService.isHighRiskAction(actionType, actionPayload)

  const decision = resolveActionDecision({ requiresConfirmation, confirmedByUser })

  const action = await createActionAuditRecord({
    session_id: sessionId,
    action_type: actionType,
    action_payload: actionPayload,
    requires_confirmation: decision.requiresConfirmation,
    confirmed_by_user: confirmedByUser,
    status: decision.status,
  })

  if (decision.status === "rejected") {
    return NextResponse.json(
      {
        error: "Action requires explicit user confirmation",
        requestId,
        data: action,
      },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true, requestId, data: action }, { status: 201 })
}
