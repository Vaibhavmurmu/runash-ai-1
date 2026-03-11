import { NextResponse } from "next/server"
import { sql } from "@/lib/editor/repository"

const DEFAULT_LOCK_TTL_SECONDS = 120

export function isSegmentLockActive(lockOwnerUserId: string | null, lockExpiresAt: string | null, now = Date.now()) {
  if (!lockOwnerUserId) return false
  if (!lockExpiresAt) return false
  return new Date(lockExpiresAt).getTime() > now
}

function resolveLockTtlSeconds() {
  const raw = Number(process.env.EDITOR_SEGMENT_LOCK_TTL_SECONDS ?? DEFAULT_LOCK_TTL_SECONDS)
  if (!Number.isFinite(raw) || raw < 30 || raw > 60 * 30) {
    return DEFAULT_LOCK_TTL_SECONDS
  }
  return Math.floor(raw)
}

export async function ensureSegmentEditable(input: { projectId: string; segmentId: string; userId: string }) {
  const [segment] = await sql<{
    id: string
    lock_owner_user_id: string | null
    lock_expires_at: string | null
  }>`
    SELECT id, lock_owner_user_id, lock_expires_at
    FROM editor_segments
    WHERE id=${input.segmentId} AND project_id=${input.projectId} AND owner_id=${input.userId}
    LIMIT 1
  `

  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 })
  }

  const activeLock = isSegmentLockActive(segment.lock_owner_user_id, segment.lock_expires_at)

  if (activeLock && segment.lock_owner_user_id !== input.userId) {
    return NextResponse.json(
      {
        error: "Segment is locked by another collaborator",
        code: "SEGMENT_LOCKED",
        lock: {
          segmentId: input.segmentId,
          lockOwnerUserId: segment.lock_owner_user_id,
          lockExpiresAt: segment.lock_expires_at,
        },
      },
      { status: 423 },
    )
  }

  return null
}

export async function lockSegment(input: { projectId: string; segmentId: string; userId: string }) {
  const ttl = resolveLockTtlSeconds()

  const [segment] = await sql<{
    id: string
    lock_owner_user_id: string | null
    lock_expires_at: string | null
    lock_acquired_at: string | null
    lock_updated_at: string | null
  }>`
    UPDATE editor_segments
    SET
      lock_owner_user_id = ${input.userId},
      lock_acquired_at = COALESCE(lock_acquired_at, now()),
      lock_updated_at = now(),
      lock_expires_at = now() + (${ttl} || ' seconds')::interval,
      updated_at = now()
    WHERE id=${input.segmentId}
      AND project_id=${input.projectId}
      AND owner_id=${input.userId}
      AND (
        lock_owner_user_id IS NULL
        OR lock_owner_user_id = ${input.userId}
        OR lock_expires_at IS NULL
        OR lock_expires_at <= now()
      )
    RETURNING id, lock_owner_user_id, lock_expires_at, lock_acquired_at, lock_updated_at
  `

  if (!segment) {
    const [existing] = await sql<{
      id: string
      lock_owner_user_id: string | null
      lock_expires_at: string | null
    }>`
      SELECT id, lock_owner_user_id, lock_expires_at
      FROM editor_segments
      WHERE id=${input.segmentId} AND project_id=${input.projectId} AND owner_id=${input.userId}
      LIMIT 1
    `

    if (!existing) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        error: "Segment is locked by another collaborator",
        code: "SEGMENT_LOCKED",
        lock: {
          segmentId: input.segmentId,
          lockOwnerUserId: existing.lock_owner_user_id,
          lockExpiresAt: existing.lock_expires_at,
        },
      },
      { status: 423 },
    )
  }

  return NextResponse.json({
    lock: {
      segmentId: input.segmentId,
      lockOwnerUserId: segment.lock_owner_user_id,
      lockExpiresAt: segment.lock_expires_at,
      lockAcquiredAt: segment.lock_acquired_at,
      lockUpdatedAt: segment.lock_updated_at,
    },
  })
}

export async function unlockSegment(input: { projectId: string; segmentId: string; userId: string }) {
  const [segment] = await sql<{
    id: string
  }>`
    UPDATE editor_segments
    SET
      lock_owner_user_id = null,
      lock_expires_at = null,
      lock_acquired_at = null,
      lock_updated_at = now(),
      updated_at = now()
    WHERE id=${input.segmentId}
      AND project_id=${input.projectId}
      AND owner_id=${input.userId}
      AND (lock_owner_user_id IS NULL OR lock_owner_user_id = ${input.userId} OR lock_expires_at <= now())
    RETURNING id
  `

  if (!segment) {
    return NextResponse.json({ error: "Segment not found or lock is owned by another collaborator" }, { status: 404 })
  }

  return NextResponse.json({ unlocked: true, segmentId: input.segmentId })
}
