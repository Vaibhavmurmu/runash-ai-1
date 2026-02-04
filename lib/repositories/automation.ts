import { one, queryMany, sql } from "@/lib/db"
import type { UUID } from "@/lib/types"

export type Workflow = {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string
  trigger_type: "manual" | "schedule" | "event" | "webhook"
  trigger_config: Record<string, any>
  workflow_steps: any[]
  status: "draft" | "active" | "paused" | "archived"
  enabled: boolean
  execution_count: number
  last_executed_at: string | null
  created_at?: string
  updated_at?: string
}

export type WorkflowExecution = {
  id: string
  workflow_id: string
  status: "running" | "completed" | "failed" | "cancelled"
  started_at: string
  completed_at: string | null
  execution_data: Record<string, any>
  result_data: Record<string, any> | null
  error_message: string | null
  total_steps: number
  completed_steps: number
}

export type WorkflowTemplate = {
  id: string
  name: string
  description: string | null
  category: string
  template_data: Record<string, any>
  is_public: boolean
  usage_count: number
  created_at?: string
  updated_at?: string
}

export async function listWorkflows(userId: UUID): Promise<Workflow[]> {
  try {
    return queryMany<Workflow>(`select * from automation_workflows where user_id=$1 order by created_at desc`, [userId])
  } catch {
    return []
  }
}

export async function getWorkflow(id: UUID, userId: UUID): Promise<Workflow | null> {
  return one<Workflow>(sql<Workflow[]>`select * from automation_workflows where id=${id} and user_id=${userId} limit 1`)
}

export async function createWorkflow(userId: UUID, input: Partial<Workflow>): Promise<Workflow> {
  const rows = await sql<Workflow[]>`
    insert into automation_workflows (
      user_id, name, description, category, trigger_type, trigger_config,
      workflow_steps, status, enabled, execution_count, last_executed_at
    )
    values (
      ${userId},
      ${input.name ?? "Untitled Workflow"},
      ${input.description ?? null},
      ${input.category ?? "general"},
      ${(input.trigger_type as any) ?? "manual"},
      ${input.trigger_config ? JSON.stringify(input.trigger_config) : "{}"},
      ${input.workflow_steps ? JSON.stringify(input.workflow_steps) : "[]"},
      ${(input.status as any) ?? "draft"},
      ${input.enabled ?? false},
      ${input.execution_count ?? 0},
      ${input.last_executed_at ?? null}
    )
    returning *
  `
  return rows[0]
}

export async function updateWorkflow(id: UUID, userId: UUID, input: Partial<Workflow>): Promise<Workflow | null> {
  const current = await getWorkflow(id, userId)
  if (!current) return null
  const rows = await sql<Workflow[]>`
    update automation_workflows
    set
      name=${input.name ?? current.name},
      description=${input.description ?? current.description},
      category=${input.category ?? current.category},
      trigger_type=${(input.trigger_type as any) ?? current.trigger_type},
      trigger_config=${input.trigger_config ? JSON.stringify(input.trigger_config) : JSON.stringify(current.trigger_config)},
      workflow_steps=${input.workflow_steps ? JSON.stringify(input.workflow_steps) : JSON.stringify(current.workflow_steps)},
      status=${(input.status as any) ?? current.status},
      enabled=${input.enabled ?? current.enabled},
      execution_count=${input.execution_count ?? current.execution_count},
      last_executed_at=${input.last_executed_at ?? current.last_executed_at},
      updated_at=now()
    where id=${id} and user_id=${userId}
    returning *
  `
  return rows[0] ?? null
}

export async function deleteWorkflow(id: UUID, userId: UUID): Promise<boolean> {
  const rows = await sql<{ id: UUID }[]>`
    delete from automation_workflows where id=${id} and user_id=${userId} returning id
  `
  return rows.length > 0
}

export async function listWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  try {
    return queryMany<WorkflowTemplate>(
      `select * from workflow_templates where is_public=true order by usage_count desc`,
    )
  } catch {
    return []
  }
}

export async function listWorkflowExecutions(userId: UUID, limit = 50): Promise<WorkflowExecution[]> {
  try {
    return queryMany<WorkflowExecution>(
      `select we.* from workflow_executions we
       join automation_workflows aw on aw.id = we.workflow_id
       where aw.user_id=$1
       order by we.started_at desc
       limit $2`,
      [userId, limit],
    )
  } catch {
    return []
  }
}

export async function createWorkflowExecution(
  workflowId: UUID,
  userId: UUID,
  inputData: Record<string, any> = {},
): Promise<WorkflowExecution | null> {
  const workflow = await getWorkflow(workflowId, userId)
  if (!workflow) return null

  const rows = await sql<WorkflowExecution[]>`
    insert into workflow_executions (
      workflow_id, status, execution_data, total_steps, completed_steps
    )
    values (
      ${workflowId},
      'running',
      ${JSON.stringify(inputData)},
      ${Array.isArray(workflow.workflow_steps) ? workflow.workflow_steps.length : 0},
      0
    )
    returning *
  `

  // Update workflow execution count
  await sql`
    update automation_workflows
    set execution_count = execution_count + 1, last_executed_at = now()
    where id=${workflowId}
  `

  return rows[0] ?? null
}
