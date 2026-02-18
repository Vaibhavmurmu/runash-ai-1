import { randomBytes } from "crypto"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function generateCode(length: number) {
  return randomBytes(length).toString("hex")
}

export async function startDeviceAuthorization(clientId: string, scope?: string) {
  const deviceCode = generateCode(24)
  const userCode = generateCode(4).toUpperCase()
  const interval = 5
  const expiresIn = 600
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  await sql`
    INSERT INTO oauth_device_authorization_sessions (
      device_code,
      user_code,
      client_id,
      scope,
      status,
      expires_at,
      interval_seconds
    ) VALUES (
      ${deviceCode},
      ${userCode},
      ${clientId},
      ${scope ?? null},
      'pending',
      ${expiresAt},
      ${interval}
    )
  `

  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/device`,
    verification_uri_complete: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/device?user_code=${userCode}`,
    expires_in: expiresIn,
    interval: interval,
  }
}

export async function approveDeviceAuthorization(userCode: string, userId: number) {
  const rows = await sql`
    UPDATE oauth_device_authorization_sessions
    SET status = 'approved', user_id = ${userId}, approved_at = NOW(), updated_at = NOW()
    WHERE user_code = ${userCode}
      AND status = 'pending'
      AND expires_at > NOW()
    RETURNING *
  `

  return rows[0] ?? null
}

export async function exchangeDeviceToken(deviceCode: string) {
  const rows = await sql`
    SELECT *
    FROM oauth_device_authorization_sessions
    WHERE device_code = ${deviceCode}
    LIMIT 1
  `

  const session = rows[0]
  if (!session) {
    return { error: "invalid_request", status: 400 as const }
  }

  if (new Date(session.expires_at).getTime() <= Date.now() || session.status === "expired") {
    await sql`
      UPDATE oauth_device_authorization_sessions
      SET status = 'expired', updated_at = NOW()
      WHERE id = ${session.id}
    `
    return { error: "expired_token", status: 400 as const }
  }

  if (session.status === "pending") {
    return { error: "authorization_pending", status: 428 as const }
  }

  if (session.status === "denied") {
    return { error: "access_denied", status: 403 as const }
  }

  return {
    access_token: generateCode(32),
    token_type: "Bearer",
    expires_in: 3600,
    scope: session.scope ?? "",
    user_id: session.user_id,
  }
}
