import { NextResponse } from "next/server"

import { queryMany } from "@/lib/db"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"
import type { LiveEditorOperation, LiveEditorPermissionMatrix, PolicyDecision, TenantQuotaDecision, TenantQuotaSnapshot } from "@/types/auth"

const DEFAULT_PERMISSION_MATRIX: LiveEditorPermissionMatrix = {
  create_stream: ["seller", "admin", "super_admin"],
  start_stream: ["seller", "admin", "super_admin"],
  stop_stream: ["seller", "admin", "super_admin"],
  edit_timeline: ["user", "editor", "seller", "admin", "super_admin"],
  run_generation: ["user", "editor", "seller", "admin", "super_admin"],
  manage_collaborators: ["admin", "super_admin"],
}

export type TenantPolicyContext = {
  userId: string
  role: string
  tenantId: string
}

type QuotaLimits = {
  concurrentLiveSessions: number
  generationJobsPerWindow: number
  generationJobsWindowSeconds: number
  storageBytesCap: number
  egressBytesCap: number
}

function parseIntegerLimit(rawValue: string | undefined, fallback: number) {
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toTenantQuotaLimits(): QuotaLimits {
  return {
    concurrentLiveSessions: parseIntegerLimit(process.env.TENANT_QUOTA_LIVE_CONCURRENT_SESSIONS, 3),
    generationJobsPerWindow: parseIntegerLimit(process.env.TENANT_QUOTA_GENERATION_JOBS_PER_WINDOW, 40),
    generationJobsWindowSeconds: parseIntegerLimit(process.env.TENANT_QUOTA_GENERATION_WINDOW_SECONDS, 600),
    storageBytesCap: parseIntegerLimit(process.env.TENANT_QUOTA_STORAGE_BYTES_CAP, 50 * 1024 * 1024 * 1024),
    egressBytesCap: parseIntegerLimit(process.env.TENANT_QUOTA_EGRESS_BYTES_CAP, 250 * 1024 * 1024 * 1024),
  }
}

export function evaluateOperationPermission(context: TenantPolicyContext, operation: LiveEditorOperation): PolicyDecision {
  const normalizedRole = context.role.trim().toLowerCase()
  const allowedRoles = DEFAULT_PERMISSION_MATRIX[operation]

  if (!allowedRoles.includes(normalizedRole)) {
    return {
      allowed: false,
      status: 403,
      code: "AUTHZ_PERMISSION_DENIED",
      message: "You do not have permission for this operation",
      details: {
        operation,
        role: normalizedRole,
      },
    }
  }

  return { allowed: true }
}

async function listTenantUserIds(tenantId: string): Promise<string[]> {
  if (!tenantId.startsWith("org:")) {
    return [tenantId.replace("user:", "")]
  }

  const organizationId = Number.parseInt(tenantId.slice(4), 10)
  if (Number.isNaN(organizationId)) return []

  const users = await queryMany<{ id: string }>(`SELECT id::text AS id FROM users WHERE sso_organization_id = $1`, [organizationId])
  return users.map((entry) => entry.id)
}

async function loadTenantQuotaSnapshot(context: TenantPolicyContext, limits: QuotaLimits): Promise<TenantQuotaSnapshot> {
  const tenantUserIds = await listTenantUserIds(context.tenantId)
  const scopedUserIds = tenantUserIds.length > 0 ? tenantUserIds : [context.userId]

  const [liveCounts] = await queryMany<{ active_count: number }>(
    `SELECT COUNT(*)::int AS active_count FROM live_stream_sessions WHERE owner_user_id::text = ANY($1::text[]) AND status IN ('starting', 'live', 'stopping')`,
    [scopedUserIds],
  )

  const [generationCounts] = await queryMany<{ window_count: number; egress_bytes: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - make_interval(secs => $2))::int AS window_count,
      COALESCE(SUM(COALESCE((provider_trace->>'egressBytes')::bigint, 0)), 0)::text AS egress_bytes
     FROM editor_render_jobs
     WHERE owner_id::text = ANY($1::text[])`,
    [scopedUserIds, limits.generationJobsWindowSeconds],
  )

  const [storageCounts] = await queryMany<{ storage_bytes: string }>(
    `SELECT COALESCE(SUM(size_bytes), 0)::text AS storage_bytes FROM editor_assets WHERE owner_id::text = ANY($1::text[])`,
    [scopedUserIds],
  )

  return {
    tenantId: context.tenantId,
    concurrentLiveSessions: Number(liveCounts?.active_count ?? 0),
    generationJobsWindow: Number(generationCounts?.window_count ?? 0),
    storageBytes: Number(storageCounts?.storage_bytes ?? 0),
    egressBytes: Number(generationCounts?.egress_bytes ?? 0),
  }
}

export function evaluateTenantQuotas(operation: LiveEditorOperation, snapshot: TenantQuotaSnapshot, limits = toTenantQuotaLimits()): TenantQuotaDecision {
  if ((operation === "create_stream" || operation === "start_stream") && snapshot.concurrentLiveSessions >= limits.concurrentLiveSessions) {
    return {
      allowed: false,
      status: 429,
      code: "TENANT_QUOTA_CONCURRENT_LIVE_SESSIONS_EXCEEDED",
      message: "Concurrent live session quota reached for tenant",
      details: { limit: limits.concurrentLiveSessions, current: snapshot.concurrentLiveSessions },
    }
  }

  if (operation === "run_generation" && snapshot.generationJobsWindow >= limits.generationJobsPerWindow) {
    return {
      allowed: false,
      status: 429,
      code: "TENANT_QUOTA_GENERATION_WINDOW_EXCEEDED",
      message: "Generation job quota reached for current window",
      details: { limit: limits.generationJobsPerWindow, current: snapshot.generationJobsWindow, windowSeconds: limits.generationJobsWindowSeconds },
    }
  }

  if ((operation === "run_generation" || operation === "create_stream" || operation === "start_stream") && snapshot.storageBytes >= limits.storageBytesCap) {
    return {
      allowed: false,
      status: 429,
      code: "TENANT_QUOTA_STORAGE_CAP_EXCEEDED",
      message: "Tenant storage cap reached",
      details: { limit: limits.storageBytesCap, current: snapshot.storageBytes },
    }
  }

  if ((operation === "run_generation" || operation === "start_stream") && snapshot.egressBytes >= limits.egressBytesCap) {
    return {
      allowed: false,
      status: 429,
      code: "TENANT_QUOTA_EGRESS_CAP_EXCEEDED",
      message: "Tenant egress cap reached",
      details: { limit: limits.egressBytesCap, current: snapshot.egressBytes },
    }
  }

  return { allowed: true }
}

export async function authorizeTenantOperation(context: TenantPolicyContext, operation: LiveEditorOperation): Promise<PolicyDecision | TenantQuotaDecision> {
  const permissionDecision = evaluateOperationPermission(context, operation)
  if (!permissionDecision.allowed) return permissionDecision

  const quotaSnapshot = await loadTenantQuotaSnapshot(context, toTenantQuotaLimits())
  const quotaDecision = evaluateTenantQuotas(operation, quotaSnapshot)
  if (!quotaDecision.allowed) return quotaDecision

  return { allowed: true }
}

export async function recordPrivilegedOperationLog(input: {
  request: Request
  context: TenantPolicyContext
  operation: LiveEditorOperation
  outcome: "allowed" | "denied"
  code?: string
}) {
  await recordSecurityAuditEvent({
    event: "admin.action.executed",
    actorUserId: input.context.userId,
    resource: `live-editor.${input.operation}`,
    request: input.request as any,
    details: {
      tenantId: input.context.tenantId,
      role: input.context.role,
      outcome: input.outcome,
      denialCode: input.code ?? null,
    },
  })
}

export function toPolicyDeniedResponse(decision: PolicyDecision | TenantQuotaDecision) {
  return NextResponse.json(
    {
      error: decision.message,
      code: decision.code,
      details: decision.details ?? {},
    },
    { status: decision.status },
  )
}
