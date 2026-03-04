import { one, queryMany, sql } from "@/lib/db"
import type { UUID } from "@/lib/types"

export type AIAgent = {
  id: string
  user_id: string
  name: string
  type: "sales" | "engagement" | "analytics" | "moderation"
  status: "active" | "idle" | "disabled"
  performance_score: number
  tasks_completed: number
  current_task: string | null
  enabled: boolean
  settings: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type CreateAIAgentInput = Pick<
  AIAgent,
  "name" | "type" | "status" | "performance_score" | "tasks_completed" | "current_task" | "enabled" | "settings"
>

export type UpdateAIAgentInput = Partial<CreateAIAgentInput>

export async function listAIAgents(userId: UUID): Promise<AIAgent[]> {
  try {
    return queryMany<AIAgent>(`select * from ai_agents where user_id=$1 order by created_at desc`, [userId])
  } catch {
    return []
  }
}

export async function getAIAgent(id: UUID, userId: UUID): Promise<AIAgent | null> {
  return one<AIAgent>(sql<AIAgent[]>`select * from ai_agents where id=${id} and user_id=${userId} limit 1`)
}

export async function createAIAgent(userId: UUID, input: CreateAIAgentInput): Promise<AIAgent> {
  const rows = await sql<AIAgent[]>`
    insert into ai_agents (
      user_id, name, type, status, performance_score, tasks_completed,
      current_task, enabled, settings
    )
    values (
      ${userId},
      ${input.name ?? "Untitled Agent"},
      ${(input.type as any) ?? "engagement"},
      ${(input.status as any) ?? "idle"},
      ${input.performance_score ?? 0},
      ${input.tasks_completed ?? 0},
      ${input.current_task ?? null},
      ${input.enabled ?? true},
      ${input.settings ? JSON.stringify(input.settings) : "{}"}
    )
    returning *
  `
  return rows[0]
}

export async function updateAIAgent(id: UUID, userId: UUID, input: UpdateAIAgentInput): Promise<AIAgent | null> {
  const current = await getAIAgent(id, userId)
  if (!current) return null
  const rows = await sql<AIAgent[]>`
    update ai_agents
    set
      name=${input.name ?? current.name},
      type=${(input.type as any) ?? current.type},
      status=${(input.status as any) ?? current.status},
      performance_score=${input.performance_score ?? current.performance_score},
      tasks_completed=${input.tasks_completed ?? current.tasks_completed},
      current_task=${input.current_task ?? current.current_task},
      enabled=${input.enabled ?? current.enabled},
      settings=${input.settings ? JSON.stringify(input.settings) : JSON.stringify(current.settings)},
      updated_at=now()
    where id=${id} and user_id=${userId}
    returning *
  `
  return rows[0] ?? null
}

export async function deleteAIAgent(id: UUID, userId: UUID): Promise<boolean> {
  const rows = await sql<{ id: UUID }[]>`
    delete from ai_agents where id=${id} and user_id=${userId} returning id
  `
  return rows.length > 0
}
