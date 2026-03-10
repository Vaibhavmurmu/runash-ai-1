import { randomUUID } from "node:crypto"
import { one, sql } from "@/lib/db"

export type TemplateScope = "public" | "workspace" | "private" | "premium"

export interface TemplateViewerContext {
  userId: string
  role: string
  workspaceId: number | null
}

export interface TemplateVariable {
  name: string
  type: "text" | "number" | "image" | "color" | "boolean"
  defaultValue: unknown
  description?: string
  required?: boolean
}

export interface TemplateRecord {
  id: string
  name: string
  description: string | null
  category: string
  thumbnailUrl: string | null
  variables: TemplateVariable[]
  html: string
  css: string
  javascript: string | null
  tags: string[]
  isPremium: boolean
  scope: TemplateScope
  author: string
  ownerUserId: string
  workspaceId: number | null
  createdAt: string
  updatedAt: string
  downloadCount: number
  viewCount: number
  usageCount: number
  rating: number
  ratingCount: number
}

export type TemplateByIdAccessResult =
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "ok"; template: TemplateRecord }

export interface ListTemplatesFilters {
  category?: string | null
  tags?: string[]
}

export interface CreateTemplateInput {
  name: string
  description?: string | null
  category: string
  thumbnailUrl?: string | null
  variables?: TemplateVariable[]
  html: string
  css: string
  javascript?: string | null
  tags?: string[]
  isPremium?: boolean
  scope?: TemplateScope
}

export interface UpdateTemplateInput {
  name?: string
  description?: string | null
  category?: string
  thumbnailUrl?: string | null
  variables?: TemplateVariable[]
  html?: string
  css?: string
  javascript?: string | null
  tags?: string[]
  isPremium?: boolean
  scope?: TemplateScope
}

type TemplateRow = {
  id: string
  name: string
  description: string | null
  category: string
  thumbnail_url: string | null
  variables: unknown
  html: string
  css: string
  javascript: string | null
  tags: unknown
  is_premium: boolean
  scope: TemplateScope
  author_name: string | null
  owner_user_id: string
  workspace_id: number | null
  created_at: string
  updated_at: string
  download_count: number | string | null
  view_count: number | string | null
  usage_count: number | string | null
  rating: number | string | null
  rating_count: number | string | null
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function parseVariables(value: unknown): TemplateVariable[] {
  if (Array.isArray(value)) {
    return value as TemplateVariable[]
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as TemplateVariable[]) : []
    } catch {
      return []
    }
  }

  return []
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

function hasPremiumAccess(role: string): boolean {
  const normalizedRole = role.toLowerCase()
  return ["premium", "pro", "business", "enterprise", "admin"].includes(normalizedRole)
}

function canViewerAccessScope(row: TemplateRow, viewer: TemplateViewerContext): boolean {
  if (row.scope === "public") {
    return true
  }

  const isOwner = row.owner_user_id === viewer.userId
  const sameWorkspace = row.workspace_id !== null && viewer.workspaceId !== null && row.workspace_id === viewer.workspaceId

  if (row.scope === "private") {
    return isOwner
  }

  if (row.scope === "workspace") {
    return isOwner || sameWorkspace
  }

  return isOwner || sameWorkspace || hasPremiumAccess(viewer.role)
}

function mapTemplateRow(row: TemplateRow): TemplateRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    thumbnailUrl: row.thumbnail_url,
    variables: parseVariables(row.variables),
    html: row.html,
    css: row.css,
    javascript: row.javascript,
    tags: parseTags(row.tags),
    isPremium: row.is_premium,
    scope: row.scope,
    author: row.author_name ?? "Unknown",
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    downloadCount: toNumber(row.download_count),
    viewCount: toNumber(row.view_count),
    usageCount: toNumber(row.usage_count),
    rating: toNumber(row.rating),
    ratingCount: toNumber(row.rating_count),
  }
}

export async function listTemplatesForViewer(
  viewer: TemplateViewerContext,
  filters: ListTemplatesFilters = {},
): Promise<TemplateRecord[]> {
  const category = filters.category?.trim() || null
  const tags = (filters.tags ?? []).map((entry) => entry.trim()).filter(Boolean)

  const rows = await sql<TemplateRow[]>`
    
    SELECT
      t.id,
      t.name,
      t.description,
      t.category,
      t.thumbnail_url,
      t.variables,
      t.html,
      t.css,
      t.javascript,
      t.tags,
      t.is_premium,
      t.scope,
      t.author_name,
      t.owner_user_id,
      t.workspace_id,
      t.created_at,
      t.updated_at,
      COALESCE(m.download_count, 0) AS download_count,
      COALESCE(m.view_count, 0) AS view_count,
      COALESCE(m.usage_count, 0) AS usage_count,
      COALESCE(m.rating, 0) AS rating,
      COALESCE(m.rating_count, 0) AS rating_count
    FROM stream_editor_templates t
    LEFT JOIN stream_editor_template_metrics m ON m.template_id = t.id
    WHERE (${category}::text IS NULL OR t.category = ${category})
      AND (${tags.length} = 0 OR t.tags && ${tags}::text[])
    ORDER BY t.updated_at DESC
  `

  return rows.filter((row) => canViewerAccessScope(row, viewer)).map(mapTemplateRow)
}

export async function getTemplateById(templateId: string): Promise<TemplateRecord | null> {
  const row = await one<TemplateRow>(sql<TemplateRow[]>`
    
    SELECT
      t.id,
      t.name,
      t.description,
      t.category,
      t.thumbnail_url,
      t.variables,
      t.html,
      t.css,
      t.javascript,
      t.tags,
      t.is_premium,
      t.scope,
      t.author_name,
      t.owner_user_id,
      t.workspace_id,
      t.created_at,
      t.updated_at,
      COALESCE(m.download_count, 0) AS download_count,
      COALESCE(m.view_count, 0) AS view_count,
      COALESCE(m.usage_count, 0) AS usage_count,
      COALESCE(m.rating, 0) AS rating,
      COALESCE(m.rating_count, 0) AS rating_count
    FROM stream_editor_templates t
    LEFT JOIN stream_editor_template_metrics m ON m.template_id = t.id
    WHERE t.id = ${templateId}
    LIMIT 1
  `)

  return row ? mapTemplateRow(row) : null
}

export async function getTemplateByIdForViewer(
  templateId: string,
  viewer: TemplateViewerContext,
): Promise<TemplateRecord | null> {
  const row = await one<TemplateRow>(sql<TemplateRow[]>`
    
    SELECT
      t.id,
      t.name,
      t.description,
      t.category,
      t.thumbnail_url,
      t.variables,
      t.html,
      t.css,
      t.javascript,
      t.tags,
      t.is_premium,
      t.scope,
      t.author_name,
      t.owner_user_id,
      t.workspace_id,
      t.created_at,
      t.updated_at,
      COALESCE(m.download_count, 0) AS download_count,
      COALESCE(m.view_count, 0) AS view_count,
      COALESCE(m.usage_count, 0) AS usage_count,
      COALESCE(m.rating, 0) AS rating,
      COALESCE(m.rating_count, 0) AS rating_count
    FROM stream_editor_templates t
    LEFT JOIN stream_editor_template_metrics m ON m.template_id = t.id
    WHERE t.id = ${templateId}
    LIMIT 1
  `)

  if (!row || !canViewerAccessScope(row, viewer)) {
    return null
  }

  return mapTemplateRow(row)
}

export async function getTemplateByIdWithAccess(
  templateId: string,
  viewer: TemplateViewerContext,
): Promise<TemplateByIdAccessResult> {
  const row = await one<TemplateRow>(sql<TemplateRow[]>`
    
    SELECT
      t.id,
      t.name,
      t.description,
      t.category,
      t.thumbnail_url,
      t.variables,
      t.html,
      t.css,
      t.javascript,
      t.tags,
      t.is_premium,
      t.scope,
      t.author_name,
      t.owner_user_id,
      t.workspace_id,
      t.created_at,
      t.updated_at,
      COALESCE(m.download_count, 0) AS download_count,
      COALESCE(m.view_count, 0) AS view_count,
      COALESCE(m.usage_count, 0) AS usage_count,
      COALESCE(m.rating, 0) AS rating,
      COALESCE(m.rating_count, 0) AS rating_count
    FROM stream_editor_templates t
    LEFT JOIN stream_editor_template_metrics m ON m.template_id = t.id
    WHERE t.id = ${templateId}
    LIMIT 1
  `)

  if (!row) {
    return { status: "not_found" }
  }

  if (!canViewerAccessScope(row, viewer)) {
    return { status: "forbidden" }
  }

  return { status: "ok", template: mapTemplateRow(row) }
}

export async function createTemplate(
  input: CreateTemplateInput,
  actor: { userId: string; workspaceId: number | null; author: string },
): Promise<TemplateRecord> {
  const id = randomUUID()

  const row = await one<TemplateRow>(sql<TemplateRow[]>`
    INSERT INTO stream_editor_templates (
      id,
      owner_user_id,
      workspace_id,
      name,
      description,
      category,
      thumbnail_url,
      variables,
      html,
      css,
      javascript,
      tags,
      is_premium,
      scope,
      author_name
    ) VALUES (
      ${id},
      ${actor.userId},
      ${actor.workspaceId},
      ${input.name},
      ${input.description ?? null},
      ${input.category},
      ${input.thumbnailUrl ?? null},
      ${JSON.stringify(input.variables ?? [])}::jsonb,
      ${input.html},
      ${input.css},
      ${input.javascript ?? null},
      ${input.tags ?? []}::text[],
      ${input.isPremium ?? false},
      ${input.scope ?? "public"},
      ${actor.author}
    )
    RETURNING
      id,
      name,
      description,
      category,
      thumbnail_url,
      variables,
      html,
      css,
      javascript,
      tags,
      is_premium,
      scope,
      author_name,
      owner_user_id,
      workspace_id,
      created_at,
      updated_at,
      0::BIGINT AS download_count,
      0::BIGINT AS view_count,
      0::BIGINT AS usage_count,
      0::NUMERIC AS rating,
      0::BIGINT AS rating_count
  `)

  if (!row) {
    throw new Error("Template create failed")
  }

  return mapTemplateRow(row)
}

export async function updateTemplateForOwner(
  templateId: string,
  actor: { userId: string; workspaceId: number | null },
  input: UpdateTemplateInput,
): Promise<TemplateRecord | null> {
  const row = await one<TemplateRow>(sql<TemplateRow[]>`
    UPDATE stream_editor_templates t
    SET
      name = COALESCE(${input.name ?? null}, t.name),
      description = COALESCE(${input.description ?? null}, t.description),
      category = COALESCE(${input.category ?? null}, t.category),
      thumbnail_url = COALESCE(${input.thumbnailUrl ?? null}, t.thumbnail_url),
      variables = COALESCE(${input.variables ? JSON.stringify(input.variables) : null}::jsonb, t.variables),
      html = COALESCE(${input.html ?? null}, t.html),
      css = COALESCE(${input.css ?? null}, t.css),
      javascript = COALESCE(${input.javascript ?? null}, t.javascript),
      tags = COALESCE(${input.tags ?? null}::text[], t.tags),
      is_premium = COALESCE(${input.isPremium ?? null}, t.is_premium),
      scope = COALESCE(${input.scope ?? null}::text, t.scope),
      updated_at = now()
    WHERE
      t.id = ${templateId}
      AND (t.owner_user_id = ${actor.userId} OR (t.workspace_id IS NOT NULL AND t.workspace_id = ${actor.workspaceId}))
    RETURNING
      id,
      name,
      description,
      category,
      thumbnail_url,
      variables,
      html,
      css,
      javascript,
      tags,
      is_premium,
      scope,
      author_name,
      owner_user_id,
      workspace_id,
      created_at,
      updated_at,
      0::BIGINT AS download_count,
      0::BIGINT AS view_count,
      0::BIGINT AS usage_count,
      0::NUMERIC AS rating,
      0::BIGINT AS rating_count
  `)

  return row ? mapTemplateRow(row) : null
}

export async function deleteTemplateForOwner(
  templateId: string,
  actor: { userId: string; workspaceId: number | null },
): Promise<boolean> {
  const deleted = await one<{ id: string }>(sql<{ id: string }[]>`
    DELETE FROM stream_editor_templates t
    WHERE
      t.id = ${templateId}
      AND (t.owner_user_id = ${actor.userId} OR (t.workspace_id IS NOT NULL AND t.workspace_id = ${actor.workspaceId}))
    RETURNING id
  `)

  return Boolean(deleted)
}
