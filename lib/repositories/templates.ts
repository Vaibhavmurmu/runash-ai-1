import { one, sql } from "@/lib/db"

export type TemplateAccessLevel = "public" | "premium" | "owner" | "workspace"

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
  javascript?: string
  isPremium: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  downloadCount: number
  viewCount: number
  usageCount: number
  rating: number
  ratingCount: number
  author: string
  ownerUserId: string | null
  workspaceId: number | null
  accessLevel: TemplateAccessLevel
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
  is_premium: boolean
  tags: unknown
  created_at: string
  updated_at: string
  author_name: string | null
  owner_user_id: string | null
  workspace_id: number | null
  access_level: TemplateAccessLevel
  download_count: number | string | null
  view_count: number | string | null
  usage_count: number | string | null
  rating: number | string | null
  rating_count: number | string | null
}

let schemaReadyPromise: Promise<void> | null = null

async function ensureTemplateSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          thumbnail_url TEXT,
          variables JSONB NOT NULL DEFAULT '[]'::jsonb,
          html TEXT NOT NULL,
          css TEXT NOT NULL,
          javascript TEXT,
          is_premium BOOLEAN NOT NULL DEFAULT false,
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          owner_user_id TEXT,
          workspace_id BIGINT,
          access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public', 'premium', 'owner', 'workspace')),
          author_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS template_usage_counters (
          template_id TEXT PRIMARY KEY REFERENCES templates(id) ON DELETE CASCADE,
          download_count BIGINT NOT NULL DEFAULT 0,
          view_count BIGINT NOT NULL DEFAULT 0,
          usage_count BIGINT NOT NULL DEFAULT 0,
          rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
          rating_count BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `

      await sql`CREATE INDEX IF NOT EXISTS idx_templates_access_level ON templates(access_level)`
      await sql`CREATE INDEX IF NOT EXISTS idx_templates_owner_user_id ON templates(owner_user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON templates(workspace_id)`
    })()
  }

  await schemaReadyPromise
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
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : []
    } catch {
      return []
    }
  }

  return []
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function canViewTemplate(template: TemplateRow, viewer: TemplateViewerContext): boolean {
  if (template.access_level === "public") {
    return true
  }

  const isOwner = Boolean(template.owner_user_id && template.owner_user_id === viewer.userId)
  const inWorkspace =
    template.workspace_id !== null && viewer.workspaceId !== null && Number(template.workspace_id) === Number(viewer.workspaceId)

  if (template.access_level === "owner") {
    return isOwner
  }

  if (template.access_level === "workspace") {
    return inWorkspace || isOwner
  }

  const role = viewer.role.toLowerCase()
  const hasPremiumAccess = ["premium", "pro", "business", "enterprise", "admin"].includes(role)

  return hasPremiumAccess || isOwner || inWorkspace
}

export async function getTemplateByIdForViewer(templateId: string, viewer: TemplateViewerContext): Promise<TemplateRecord | null> {
  await ensureTemplateSchema()

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
      t.is_premium,
      t.tags,
      t.created_at,
      t.updated_at,
      t.author_name,
      t.owner_user_id,
      t.workspace_id,
      t.access_level,
      COALESCE(c.download_count, 0) AS download_count,
      COALESCE(c.view_count, 0) AS view_count,
      COALESCE(c.usage_count, 0) AS usage_count,
      COALESCE(c.rating, 0) AS rating,
      COALESCE(c.rating_count, 0) AS rating_count
    FROM templates t
    LEFT JOIN template_usage_counters c ON c.template_id = t.id
    WHERE t.id = ${templateId}
    LIMIT 1
  `)

  if (!row) return null

  if (!canViewTemplate(row, viewer)) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    thumbnailUrl: row.thumbnail_url,
    variables: parseVariables(row.variables),
    html: row.html,
    css: row.css,
    ...(row.javascript ? { javascript: row.javascript } : {}),
    isPremium: row.is_premium,
    tags: parseTags(row.tags),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    downloadCount: toNumber(row.download_count),
    viewCount: toNumber(row.view_count),
    usageCount: toNumber(row.usage_count),
    rating: toNumber(row.rating),
    ratingCount: toNumber(row.rating_count),
    author: row.author_name ?? "Unknown",
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    accessLevel: row.access_level,
  }
}

export async function getTemplateById(templateId: string): Promise<TemplateRecord | null> {
  await ensureTemplateSchema()

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
      t.is_premium,
      t.tags,
      t.created_at,
      t.updated_at,
      t.author_name,
      t.owner_user_id,
      t.workspace_id,
      t.access_level,
      COALESCE(c.download_count, 0) AS download_count,
      COALESCE(c.view_count, 0) AS view_count,
      COALESCE(c.usage_count, 0) AS usage_count,
      COALESCE(c.rating, 0) AS rating,
      COALESCE(c.rating_count, 0) AS rating_count
    FROM templates t
    LEFT JOIN template_usage_counters c ON c.template_id = t.id
    WHERE t.id = ${templateId}
    LIMIT 1
  `)

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    thumbnailUrl: row.thumbnail_url,
    variables: parseVariables(row.variables),
    html: row.html,
    css: row.css,
    ...(row.javascript ? { javascript: row.javascript } : {}),
    isPremium: row.is_premium,
    tags: parseTags(row.tags),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    downloadCount: toNumber(row.download_count),
    viewCount: toNumber(row.view_count),
    usageCount: toNumber(row.usage_count),
    rating: toNumber(row.rating),
    ratingCount: toNumber(row.rating_count),
    author: row.author_name ?? "Unknown",
    ownerUserId: row.owner_user_id,
    workspaceId: row.workspace_id,
    accessLevel: row.access_level,
  }
}
