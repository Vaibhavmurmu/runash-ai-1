import { NextResponse } from "next/server"
import { getProjectById, sql } from "@/lib/editor/repository"
import { publishTimelineConflict } from "@/services/realtime/publishers"

export type MergeStrategy = "server_minimal" | "client_assisted"

export function parseExpectedVersion(request: Request, body: Record<string, unknown>) {
  const ifMatch = request.headers.get("if-match")
  const raw = ifMatch ?? (typeof body.version === "number" ? String(body.version) : typeof body.version === "string" ? body.version : null)

  if (!raw) {
    return {
      error: NextResponse.json(
        {
          error: "Missing version precondition",
          code: "PRECONDITION_REQUIRED",
          message: "Provide If-Match header or version in request body.",
        },
        { status: 428 },
      ),
    }
  }

  const normalized = raw.replace(/^[Ww]\//, "").replace(/^"|"$/g, "")
  const expectedVersion = Number(normalized)
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return {
      error: NextResponse.json({ error: "Invalid version precondition", code: "INVALID_VERSION" }, { status: 400 }),
    }
  }

  return { expectedVersion }
}

export function resolveMergeStrategy(body: Record<string, unknown>, request: Request): MergeStrategy {
  const strategy = body.mergeStrategy ?? request.headers.get("x-merge-strategy")
  if (strategy === "server_minimal") return "server_minimal"
  return "client_assisted"
}

export function applyMergeStrategy<T extends Record<string, unknown>>(
  serverState: T,
  incomingPatch: Record<string, unknown>,
  strategy: MergeStrategy,
): { merged: T; mode: "auto_merged" | "manual_required"; mergedFields: string[] } {
  if (strategy !== "server_minimal") {
    return { merged: serverState, mode: "manual_required", mergedFields: [] }
  }

  const merged = { ...serverState }
  const mergedFields: string[] = []
  for (const [key, value] of Object.entries(incomingPatch)) {
    if (!(key in serverState)) continue
    const current = serverState[key]
    const canAutoMerge =
      (current && typeof current === "object" && value && typeof value === "object") ||
      current === null ||
      typeof current === "number" ||
      typeof current === "string" ||
      typeof current === "boolean"

    if (canAutoMerge) {
      merged[key as keyof T] = value as T[keyof T]
      mergedFields.push(key)
    }
  }

  return { merged: merged as T, mode: "auto_merged", mergedFields }
}

type ClaimDeps = {
  sqlClient?: typeof sql
  getProject?: typeof getProjectById
  publishConflict?: typeof publishTimelineConflict
}

export async function claimProjectVersion(input: {
  projectId: string
  userId: string
  expectedVersion: number
  mutation: string
  targetType: "timeline" | "track" | "segment" | "asset" | "project"
  targetId?: string | null
}, deps: ClaimDeps = {}) {
  const sqlClient = deps.sqlClient ?? sql
  const getProject = deps.getProject ?? getProjectById
  const publishConflict = deps.publishConflict ?? publishTimelineConflict

  const rows = await sqlClient`
    UPDATE editor_projects
    SET version = version + 1,
        updated_by = ${input.userId},
        updated_at = now()
    WHERE id = ${input.projectId}
      AND owner_id = ${input.userId}
      AND version = ${input.expectedVersion}
    RETURNING id, version
  `

  if (rows.length > 0) {
    return { ok: true as const, projectVersion: Number(rows[0].version) }
  }

  const latest = await getProject(input.userId, input.projectId)
  if (!latest) {
    return { ok: false as const, response: NextResponse.json({ error: "Project not found" }, { status: 404 }) }
  }

  publishConflict({
    projectId: input.projectId,
    actorUserId: input.userId,
    expectedVersion: input.expectedVersion,
    actualVersion: latest.version,
    mutation: input.mutation,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
  })

  return {
    ok: false as const,
    response: NextResponse.json(
      {
        error: "Version conflict",
        code: "VERSION_CONFLICT",
        conflict: {
          expectedVersion: input.expectedVersion,
          actualVersion: latest.version,
          mutation: input.mutation,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          resolution: {
            supportedStrategies: ["server_minimal", "client_assisted"],
            recommended: "client_assisted",
          },
        },
        latest,
      },
      { status: 409 },
    ),
  }
}

export async function bumpTimelineVersion(timelineId: string, projectId: string, userId: string) {
  await sql`
    UPDATE editor_timelines
    SET version = version + 1,
        updated_by = ${userId},
        updated_at = now()
    WHERE id = ${timelineId}
      AND project_id = ${projectId}
      AND owner_id = ${userId}
  `
}
