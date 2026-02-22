import { queryMany, sql } from "@/lib/db"
import type { ModelExecutionState, ModelDialogRunHistoryItem, ModelDialogTriggerSource } from "@/lib/types/model-dialog"
import { z } from "zod"

type ModelDialogRunStatus = Exclude<ModelExecutionState, "idle">

type ModelDialogRunRow = {
  id: string
  user_id: string
  model_id: string
  source_module: ModelDialogTriggerSource | "dashboard"
  input_summary: string
  status: ModelDialogRunStatus
  created_at: string
  updated_at: string
}

function toHistoryItem(row: ModelDialogRunRow): ModelDialogRunHistoryItem {
  return {
    id: row.id,
    modelId: row.model_id,
    sourceModule: row.source_module,
    inputSummary: row.input_summary,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function summarizeInput(input: string): string {
  const normalized = input.replace(/\s+/g, " ").trim()
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized
}

function toRunId(requestId: string): string {
  const parsed = z.string().uuid().safeParse(requestId)
  return parsed.success ? parsed.data : crypto.randomUUID()
}

export async function createModelDialogRun(params: {
  requestId: string
  userId: string
  modelId: string
  sourceModule: ModelDialogTriggerSource | "dashboard"
  input: string
  status: ModelDialogRunStatus
}) {
  const runId = toRunId(params.requestId)

  await sql`
    insert into model_dialog_runs (id, user_id, model_id, source_module, input_summary, status)
    values (${runId}::uuid, ${params.userId}::uuid, ${params.modelId}, ${params.sourceModule}, ${summarizeInput(params.input)}, ${params.status})
    on conflict (id) do update
      set model_id = excluded.model_id,
          source_module = excluded.source_module,
          input_summary = excluded.input_summary,
          status = excluded.status,
          updated_at = now()
  `

  return runId
}

export async function updateModelDialogRunStatus(requestId: string, status: ModelDialogRunStatus) {
  await sql`
    update model_dialog_runs
    set status = ${status}, updated_at = now()
    where id::text = ${requestId}
  `
}

export async function listRecentModelDialogRuns(userId: string, limit = 5): Promise<ModelDialogRunHistoryItem[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 20))
  const rows = await queryMany<ModelDialogRunRow>(
    `select id, user_id, model_id, source_module, input_summary, status, created_at, updated_at
     from model_dialog_runs
     where user_id = $1::uuid
     order by created_at desc
     limit $2`,
    [userId, boundedLimit],
  )

  return rows.map(toHistoryItem)
}
