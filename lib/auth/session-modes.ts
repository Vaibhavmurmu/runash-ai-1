import { createHash, randomBytes } from "node:crypto"
import { queryMany, queryOne } from "@/lib/db"
import { recordAuthMetric } from "@/lib/auth-observability"

export type AuthSessionMode = "cookie" | "bearer" | "ott"

export type SessionDeviceMetadata = {
  deviceName?: string | null
  deviceId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export type AuthSessionRecord = {
  id: string
  userId: string
  mode: AuthSessionMode
  scope: string
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  linkedFromSessionId: string | null
  deviceId: string | null
  deviceName: string | null
  userAgent: string | null
}

export type TrustedDeviceRecord = {
  deviceId: string
  deviceName: string | null
  lastSeenAt: string
  trustedAt: string
}

const AUTH_SESSION_MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS auth_session_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_user_id TEXT,
    linked_at TIMESTAMPTZ
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS auth_session_registry (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'default',
    status TEXT NOT NULL DEFAULT 'active',
    linked_from_session_id TEXT,
    organization_id BIGINT,
    token_hash TEXT,
    device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invalidated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    rotation_due_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, scope, id)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS auth_one_time_transfer_tokens (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES auth_session_registry(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    source_domain TEXT NOT NULL,
    target_domain TEXT NOT NULL,
    consumed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_auth_session_registry_user_last_seen ON auth_session_registry(user_id, last_seen_at DESC);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_auth_session_registry_token_hash ON auth_session_registry(token_hash) WHERE token_hash IS NOT NULL;
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_auth_transfer_tokens_hash ON auth_one_time_transfer_tokens(token_hash);
  `,
  `
  CREATE TABLE IF NOT EXISTS auth_trusted_devices (
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    organization_id BIGINT,
    trusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id)
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_auth_trusted_devices_user_last_seen ON auth_trusted_devices(user_id, last_seen_at DESC);
  `,
  `
  ALTER TABLE auth_session_registry ADD COLUMN IF NOT EXISTS organization_id BIGINT;
  `,
  `
  ALTER TABLE auth_trusted_devices ADD COLUMN IF NOT EXISTS organization_id BIGINT;
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_auth_session_registry_org_user_last_seen
    ON auth_session_registry(organization_id, user_id, last_seen_at DESC)
    WHERE organization_id IS NOT NULL;
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_auth_trusted_devices_org_user_last_seen
    ON auth_trusted_devices(organization_id, user_id, last_seen_at DESC)
    WHERE organization_id IS NOT NULL;
  `,
] as const

export async function ensureAuthSessionModeTables() {
  for (const statement of AUTH_SESSION_MIGRATIONS) {
    await queryMany(statement)
  }
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex")
}

function createId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`
}

export async function createAnonymousIdentity() {
  await ensureAuthSessionModeTables()

  const anonymousId = createId("anon")
  await queryMany(`INSERT INTO auth_session_identities (id) VALUES ($1)`, [anonymousId])

  return anonymousId
}

export async function linkAnonymousIdentity(anonymousId: string, userId: string) {
  await ensureAuthSessionModeTables()

  await queryMany(
    `UPDATE auth_session_identities
     SET linked_user_id = $2, linked_at = NOW(), user_id = COALESCE(user_id, $2)
     WHERE id = $1`,
    [anonymousId, userId],
  )
}

export async function createAuthSession(input: {
  userId: string
  mode: AuthSessionMode
  scope?: string
  linkedFromSessionId?: string | null
  token?: string | null
  ttlMinutes?: number
  device?: SessionDeviceMetadata
}) {
  await ensureAuthSessionModeTables()

  const sessionId = createId("sess")
  const ttlMinutes = Math.max(1, input.ttlMinutes ?? 60 * 24 * 7)
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
  const rotationDueAt = new Date(Date.now() + Math.min(ttlMinutes, 60 * 24) * 60_000)

  await queryMany(
    `INSERT INTO auth_session_registry
      (id, user_id, mode, scope, linked_from_session_id, organization_id, token_hash, device_metadata, expires_at, rotation_due_at)
     VALUES
      ($1, $2, $3, $4, $5, (SELECT sso_organization_id FROM users WHERE id = $2), $6, $7::jsonb, $8, $9)`,
    [
      sessionId,
      input.userId,
      input.mode,
      input.scope ?? "default",
      input.linkedFromSessionId ?? null,
      input.token ? hashSecret(input.token) : null,
      JSON.stringify({
        deviceName: input.device?.deviceName ?? null,
        deviceId: input.device?.deviceId ?? null,
        ipAddress: input.device?.ipAddress ?? null,
        userAgent: input.device?.userAgent ?? null,
      }),
      expiresAt.toISOString(),
      rotationDueAt.toISOString(),
    ],
  )

  recordAuthMetric("auth.session.created", { mode: input.mode, scope: input.scope ?? "default" })

  if (input.device?.deviceId) {
    await queryMany(
      `INSERT INTO auth_trusted_devices (user_id, device_id, device_name, organization_id, last_seen_at)
       VALUES ($1, $2, $3, (SELECT sso_organization_id FROM users WHERE id = $1), NOW())
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET
         device_name = EXCLUDED.device_name,
         organization_id = COALESCE(EXCLUDED.organization_id, auth_trusted_devices.organization_id),
         last_seen_at = NOW()`,
      [input.userId, input.device.deviceId, input.device.deviceName ?? null],
    )
  }

  return {
    id: sessionId,
    userId: input.userId,
    mode: input.mode,
    scope: input.scope ?? "default",
    expiresAt: expiresAt.toISOString(),
  }
}

export async function listActiveUserSessions(userId: string): Promise<AuthSessionRecord[]> {
  await ensureAuthSessionModeTables()

  return queryMany<AuthSessionRecord>(
    `SELECT id, user_id AS "userId", mode, scope, created_at AS "createdAt", last_seen_at AS "lastSeenAt", expires_at AS "expiresAt",
            linked_from_session_id AS "linkedFromSessionId", device_metadata->>'deviceId' AS "deviceId",
            device_metadata->>'deviceName' AS "deviceName", device_metadata->>'userAgent' AS "userAgent"
     FROM auth_session_registry
     WHERE user_id = $1 AND status = 'active' AND (invalidated_at IS NULL) AND expires_at > NOW()
     ORDER BY last_seen_at DESC`,
    [userId],
  )
}

export async function listTrustedDevices(userId: string): Promise<TrustedDeviceRecord[]> {
  await ensureAuthSessionModeTables()

  return queryMany<TrustedDeviceRecord>(
    `SELECT device_id AS "deviceId", device_name AS "deviceName", last_seen_at AS "lastSeenAt", trusted_at AS "trustedAt"
     FROM auth_trusted_devices
     WHERE user_id = $1
     ORDER BY last_seen_at DESC`,
    [userId],
  )
}

export async function trustUserDevice(input: { userId: string; deviceId: string; deviceName?: string | null }) {
  await ensureAuthSessionModeTables()

  return queryOne<TrustedDeviceRecord>(
    `INSERT INTO auth_trusted_devices (user_id, device_id, device_name, organization_id, trusted_at, last_seen_at)
     VALUES ($1, $2, $3, (SELECT sso_organization_id FROM users WHERE id = $1), NOW(), NOW())
     ON CONFLICT (user_id, device_id)
     DO UPDATE SET
       device_name = COALESCE(EXCLUDED.device_name, auth_trusted_devices.device_name),
       organization_id = COALESCE(EXCLUDED.organization_id, auth_trusted_devices.organization_id),
       trusted_at = NOW(),
       last_seen_at = NOW()
     RETURNING device_id AS "deviceId", device_name AS "deviceName", last_seen_at AS "lastSeenAt", trusted_at AS "trustedAt"`,
    [input.userId, input.deviceId, input.deviceName ?? null],
  )
}

export async function revokeTrustedDevice(userId: string, deviceId: string) {
  await ensureAuthSessionModeTables()

  await queryMany(`DELETE FROM auth_trusted_devices WHERE user_id = $1 AND device_id = $2`, [userId, deviceId])
}

export async function switchUserSessionScope(userId: string, sessionId: string, scope: string) {
  await ensureAuthSessionModeTables()

  return queryOne<{ id: string; userId: string; scope: string }>(
    `UPDATE auth_session_registry
     SET scope = $3, last_seen_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'active'
     RETURNING id, user_id AS "userId", scope`,
    [sessionId, userId, scope],
  )
}

export async function invalidateSession(options: { sessionId?: string; userId?: string; reason: string }) {
  await ensureAuthSessionModeTables()

  if (options.sessionId && options.userId) {
    await queryMany(
      `UPDATE auth_session_registry
       SET status = 'invalidated', invalidated_at = NOW(), last_seen_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [options.sessionId, options.userId],
    )
  } else if (options.sessionId) {
    await queryMany(
      `UPDATE auth_session_registry
       SET status = 'invalidated', invalidated_at = NOW(), last_seen_at = NOW()
       WHERE id = $1`,
      [options.sessionId],
    )
  } else if (options.userId) {
    await queryMany(
      `UPDATE auth_session_registry
       SET status = 'invalidated', invalidated_at = NOW(), last_seen_at = NOW()
       WHERE user_id = $1`,
      [options.userId],
    )
  }

  recordAuthMetric("auth.session.invalidated", { reason: options.reason })
}

export async function rotateSessionToken(sessionId: string, token: string, ttlMinutes = 60 * 24 * 7) {
  await ensureAuthSessionModeTables()

  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
  const row = await queryOne<{ id: string }>(
    `UPDATE auth_session_registry
     SET token_hash = $2, expires_at = $3, rotation_due_at = NOW() + INTERVAL '24 hours', last_seen_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING id`,
    [sessionId, hashSecret(token), expiresAt.toISOString()],
  )

  return row
}

export async function resolveBearerAuthSession(token: string) {
  await ensureAuthSessionModeTables()

  return queryOne<{ userId: string; sessionId: string }>(
    `SELECT user_id AS "userId", id AS "sessionId"
     FROM auth_session_registry
     WHERE token_hash = $1
       AND mode = 'bearer'
       AND status = 'active'
       AND expires_at > NOW()
     LIMIT 1`,
    [hashSecret(token)],
  )
}

export async function issueOneTimeTransferToken(input: { sessionId: string; sourceDomain: string; targetDomain: string; ttlSeconds?: number }) {
  await ensureAuthSessionModeTables()

  const ttlSeconds = Math.max(30, Math.min(input.ttlSeconds ?? 120, 600))
  const rawToken = randomBytes(24).toString("base64url")
  const transferId = createId("ott")
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  await queryMany(
    `INSERT INTO auth_one_time_transfer_tokens (id, session_id, token_hash, source_domain, target_domain, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [transferId, input.sessionId, hashSecret(rawToken), input.sourceDomain, input.targetDomain, expiresAt.toISOString()],
  )

  return {
    transferId,
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function verifyOneTimeTransferToken(input: { token: string; sourceDomain: string; targetDomain: string }) {
  await ensureAuthSessionModeTables()

  const row = await queryOne<{ transferId: string; sessionId: string; userId: string }>(
    `UPDATE auth_one_time_transfer_tokens ott
     SET consumed_at = NOW()
     FROM auth_session_registry sr
     WHERE ott.token_hash = $1
       AND ott.consumed_at IS NULL
       AND ott.expires_at > NOW()
       AND ott.source_domain = $2
       AND ott.target_domain = $3
       AND sr.id = ott.session_id
     RETURNING ott.id AS "transferId", ott.session_id AS "sessionId", sr.user_id AS "userId"`,
    [hashSecret(input.token), input.sourceDomain, input.targetDomain],
  )

  return row
}
