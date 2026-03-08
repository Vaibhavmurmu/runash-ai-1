import { randomUUID } from "crypto"
import { sql } from "@/lib/editor/repository"

export type CollaborationSettings = {
  allowComments: boolean
  allowEditing: boolean
  showActivityLog: boolean
}

const DEFAULT_COLLABORATION_SETTINGS: CollaborationSettings = {
  allowComments: true,
  allowEditing: true,
  showActivityLog: true,
}

function normalizeCollaborationSettings(value: unknown): CollaborationSettings {
  if (!value || typeof value !== "object") return DEFAULT_COLLABORATION_SETTINGS
  const record = value as Record<string, unknown>

  return {
    allowComments: typeof record.allowComments === "boolean" ? record.allowComments : DEFAULT_COLLABORATION_SETTINGS.allowComments,
    allowEditing: typeof record.allowEditing === "boolean" ? record.allowEditing : DEFAULT_COLLABORATION_SETTINGS.allowEditing,
    showActivityLog:
      typeof record.showActivityLog === "boolean" ? record.showActivityLog : DEFAULT_COLLABORATION_SETTINGS.showActivityLog,
  }
}

export type ProjectCollaboratorRecord = {
  id: string
  project_id: string
  owner_id: string
  user_id: string | null
  name: string
  email: string
  avatar_url: string | null
  role: "editor" | "viewer"
  status: "online" | "idle" | "offline"
  last_active_at: string
  created_at: string
  updated_at: string
}



export type ProjectCollaborationInviteRecord = {
  id: string
  project_id: string
  owner_id: string
  invited_by_user_id: string | null
  invited_by_name: string | null
  email: string
  role: "editor" | "viewer"
  token: string
  status: "pending" | "accepted" | "revoked" | "expired"
  expires_at: string
  accepted_at: string | null
  accepted_by_user_id: string | null
  accepted_by_email: string | null
  created_at: string
  updated_at: string
}

export type ProjectActivityRecord = {
  id: string
  project_id: string
  owner_id: string
  actor_user_id: string | null
  actor_name: string
  action: string
  activity_type: "edit" | "comment" | "collaboration" | "system"
  details: Record<string, unknown>
  created_at: string
}

let schemaReady: Promise<void> | null = null

async function ensureCollaborationSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS editor_project_collaborators (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id uuid NOT NULL REFERENCES editor_projects(id) ON DELETE CASCADE,
          owner_id text NOT NULL,
          user_id text,
          name text NOT NULL,
          email text NOT NULL,
          avatar_url text,
          role text NOT NULL CHECK (role IN ('editor', 'viewer')),
          status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'idle', 'offline')),
          last_active_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(project_id, lower(email))
        )
      `

      await sql`CREATE INDEX IF NOT EXISTS idx_editor_project_collaborators_project_owner ON editor_project_collaborators(project_id, owner_id)`

      await sql`
        CREATE TABLE IF NOT EXISTS editor_project_activity (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id uuid NOT NULL REFERENCES editor_projects(id) ON DELETE CASCADE,
          owner_id text NOT NULL,
          actor_user_id text,
          actor_name text NOT NULL,
          action text NOT NULL,
          activity_type text NOT NULL CHECK (activity_type IN ('edit', 'comment', 'collaboration', 'system')),
          details jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `

      await sql`CREATE INDEX IF NOT EXISTS idx_editor_project_activity_project_owner ON editor_project_activity(project_id, owner_id, created_at DESC)`

      await sql`
        CREATE TABLE IF NOT EXISTS editor_project_collaboration_invites (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id uuid NOT NULL REFERENCES editor_projects(id) ON DELETE CASCADE,
          owner_id text NOT NULL,
          invited_by_user_id text,
          invited_by_name text,
          email text NOT NULL,
          role text NOT NULL CHECK (role IN ('editor', 'viewer')),
          token text NOT NULL UNIQUE,
          status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
          expires_at timestamptz NOT NULL,
          accepted_at timestamptz,
          accepted_by_user_id text,
          accepted_by_email text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(project_id, email, status)
        )
      `

      await sql`CREATE INDEX IF NOT EXISTS idx_editor_project_collab_invites_project_owner ON editor_project_collaboration_invites(project_id, owner_id, created_at DESC)`
      await sql`CREATE INDEX IF NOT EXISTS idx_editor_project_collab_invites_token ON editor_project_collaboration_invites(token)`

    })()
  }

  await schemaReady
}

export async function listProjectCollaborators(projectId: string, ownerId: string): Promise<ProjectCollaboratorRecord[]> {
  await ensureCollaborationSchema()
  return (await sql`
    SELECT id, project_id, owner_id, user_id, name, email, avatar_url, role, status, last_active_at, created_at, updated_at
    FROM editor_project_collaborators
    WHERE project_id=${projectId} AND owner_id=${ownerId}
    ORDER BY created_at ASC
  `) as ProjectCollaboratorRecord[]
}

export async function inviteProjectCollaborator(input: {
  projectId: string
  ownerId: string
  email: string
  role: "editor" | "viewer"
  invitedByUserId: string
  invitedByName: string
}) {
  await ensureCollaborationSchema()

  const [collaborator] = (await sql`
    INSERT INTO editor_project_collaborators (project_id, owner_id, email, name, role, status, last_active_at)
    VALUES (${input.projectId}, ${input.ownerId}, ${input.email.toLowerCase()}, ${input.email}, ${input.role}, 'offline', now())
    ON CONFLICT (project_id, lower(email)) DO UPDATE
      SET role = EXCLUDED.role,
          updated_at = now()
    RETURNING id, project_id, owner_id, user_id, name, email, avatar_url, role, status, last_active_at, created_at, updated_at
  `) as ProjectCollaboratorRecord[]

  await appendProjectActivity({
    projectId: input.projectId,
    ownerId: input.ownerId,
    actorUserId: input.invitedByUserId,
    actorName: input.invitedByName,
    action: `invited ${input.email} as ${input.role}`,
    activityType: "collaboration",
    details: {
      collaboratorId: collaborator.id,
      collaboratorEmail: collaborator.email,
      role: collaborator.role,
      kind: "invite",
    },
  })

  return collaborator
}

export async function revokeProjectCollaborator(input: {
  projectId: string
  ownerId: string
  collaboratorId: string
  revokedByUserId: string
  revokedByName: string
}) {
  await ensureCollaborationSchema()

  const [removed] = (await sql`
    DELETE FROM editor_project_collaborators
    WHERE id=${input.collaboratorId} AND project_id=${input.projectId} AND owner_id=${input.ownerId}
    RETURNING id, project_id, owner_id, user_id, name, email, avatar_url, role, status, last_active_at, created_at, updated_at
  `) as ProjectCollaboratorRecord[]

  if (!removed) return null

  await appendProjectActivity({
    projectId: input.projectId,
    ownerId: input.ownerId,
    actorUserId: input.revokedByUserId,
    actorName: input.revokedByName,
    action: `revoked ${removed.email}`,
    activityType: "collaboration",
    details: {
      collaboratorId: removed.id,
      collaboratorEmail: removed.email,
      kind: "revoke",
    },
  })

  return removed
}

export async function listProjectActivity(projectId: string, ownerId: string, limit = 100): Promise<ProjectActivityRecord[]> {
  await ensureCollaborationSchema()
  return (await sql`
    SELECT id, project_id, owner_id, actor_user_id, actor_name, action, activity_type, details, created_at
    FROM editor_project_activity
    WHERE project_id=${projectId} AND owner_id=${ownerId}
    ORDER BY created_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 200))}
  `) as ProjectActivityRecord[]
}

export async function appendProjectActivity(input: {
  projectId: string
  ownerId: string
  actorUserId?: string | null
  actorName: string
  action: string
  activityType: "edit" | "comment" | "collaboration" | "system"
  details?: Record<string, unknown>
}) {
  await ensureCollaborationSchema()
  const [activity] = (await sql`
    INSERT INTO editor_project_activity (project_id, owner_id, actor_user_id, actor_name, action, activity_type, details)
    VALUES (${input.projectId}, ${input.ownerId}, ${input.actorUserId ?? null}, ${input.actorName}, ${input.action}, ${input.activityType}, ${JSON.stringify(input.details ?? {})}::jsonb)
    RETURNING id, project_id, owner_id, actor_user_id, actor_name, action, activity_type, details, created_at
  `) as ProjectActivityRecord[]
  return activity
}



export async function getProjectOwnerId(projectId: string): Promise<string | null> {
  await ensureCollaborationSchema()
  const [project] = (await sql`SELECT owner_id FROM editor_projects WHERE id=${projectId} LIMIT 1`) as Array<{ owner_id: string }>
  return project?.owner_id ?? null
}

export async function touchCollaboratorPresence(input: {
  projectId: string
  ownerId: string
  userId: string
  state: "join" | "leave"
}) {
  await ensureCollaborationSchema()
  const status = input.state === "join" ? "online" : "offline"
  await sql`
    UPDATE editor_project_collaborators
    SET status=${status}, last_active_at=now(), updated_at=now()
    WHERE project_id=${input.projectId} AND owner_id=${input.ownerId} AND user_id=${input.userId}
  `
}

export async function getCollaborationSettings(projectId: string, ownerId: string): Promise<CollaborationSettings> {
  await ensureCollaborationSchema()
  const [project] = (await sql`
    SELECT metadata
    FROM editor_projects
    WHERE id=${projectId} AND owner_id=${ownerId}
    LIMIT 1
  `) as Array<{ metadata: Record<string, unknown> | null }>

  const metadata = project?.metadata && typeof project.metadata === "object" ? project.metadata : {}
  return normalizeCollaborationSettings((metadata as Record<string, unknown>).collaborationSettings)
}

export async function updateCollaborationSettings(input: {
  projectId: string
  ownerId: string
  settings: CollaborationSettings
}) {
  await ensureCollaborationSchema()
  const [project] = (await sql`
    UPDATE editor_projects
    SET
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('collaborationSettings', ${JSON.stringify(input.settings)}::jsonb),
      updated_at = now()
    WHERE id=${input.projectId} AND owner_id=${input.ownerId}
    RETURNING id
  `) as Array<{ id: string }>

  return project ?? null
}
