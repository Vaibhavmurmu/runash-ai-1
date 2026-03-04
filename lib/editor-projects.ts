import { sql } from "@/lib/db"
import type { CreateEditorProjectInput, EditorProject, UpdateEditorProjectInput } from "@/types/editor-project"

type EditorProjectRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: EditorProject["status"]
  selected_model: string
  timeline: EditorProject["timeline"]
  settings: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

const DEFAULT_TIMELINE: EditorProject["timeline"] = {
  duration: 10,
  fps: 30,
  tracks: [],
}

function toEditorProject(row: EditorProjectRow): EditorProject {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    selectedModel: row.selected_model,
    timeline: row.timeline,
    settings: row.settings ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class EditorProjectsService {
  static async listByUser(userId: string, limit = 50): Promise<EditorProject[]> {
    const rows = await sql<EditorProjectRow>`
      SELECT *
      FROM editor_projects
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `

    return rows.map(toEditorProject)
  }

  static async create(userId: string, input: CreateEditorProjectInput): Promise<EditorProject> {
    const rows = await sql<EditorProjectRow>`
      INSERT INTO editor_projects (user_id, title, description, selected_model, timeline, settings, metadata)
      VALUES (
        ${userId},
        ${input.title},
        ${input.description ?? null},
        ${input.selectedModel ?? "wan-2.1"},
        ${JSON.stringify(input.timeline ?? DEFAULT_TIMELINE)},
        ${JSON.stringify(input.settings ?? {})},
        ${JSON.stringify(input.metadata ?? {})}
      )
      RETURNING *
    `

    return toEditorProject(rows[0])
  }

  static async getById(projectId: string, userId: string): Promise<EditorProject | null> {
    const rows = await sql<EditorProjectRow>`
      SELECT *
      FROM editor_projects
      WHERE id = ${projectId} AND user_id = ${userId}
      LIMIT 1
    `

    if (!rows[0]) {
      return null
    }

    return toEditorProject(rows[0])
  }

  static async update(projectId: string, userId: string, updates: UpdateEditorProjectInput): Promise<EditorProject | null> {
    const existing = await this.getById(projectId, userId)
    if (!existing) {
      return null
    }

    const rows = await sql<EditorProjectRow>`
      UPDATE editor_projects
      SET
        title = ${updates.title ?? existing.title},
        description = ${updates.description === undefined ? existing.description : updates.description},
        status = ${updates.status ?? existing.status},
        selected_model = ${updates.selectedModel ?? existing.selectedModel},
        timeline = ${JSON.stringify(updates.timeline ?? existing.timeline)},
        settings = ${JSON.stringify(updates.settings ?? existing.settings)},
        metadata = ${JSON.stringify(updates.metadata ?? existing.metadata)}
      WHERE id = ${projectId} AND user_id = ${userId}
      RETURNING *
    `

    if (!rows[0]) {
      return null
    }

    return toEditorProject(rows[0])
  }

  static async remove(projectId: string, userId: string): Promise<boolean> {
    const rows = await sql<{ id: string }>`
      DELETE FROM editor_projects
      WHERE id = ${projectId} AND user_id = ${userId}
      RETURNING id
    `

    return Boolean(rows[0]?.id)
  }
}
