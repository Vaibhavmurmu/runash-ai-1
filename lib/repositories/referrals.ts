import { queryMany, queryOne } from "@/lib/db"

export type ReferralInviteRecord = {
  id: string
  inviterUserId: string
  inviterEmail: string | null
  inviteeEmail: string
  inviteCode: string
  status: "invited" | "converted" | "expired"
  sentAt: string
  convertedAt: string | null
}

export type ReferralConversionRecord = {
  id: string
  inviteId: string
  inviterUserId: string
  convertedUserId: string | null
  conversionSource: string
  createdAt: string
}

export async function findReferralInviteByInviterAndEmail(inviterUserId: string, email: string) {
  return queryOne<ReferralInviteRecord>(
    `
      SELECT
        id::text,
        inviter_user_id AS "inviterUserId",
        inviter_email AS "inviterEmail",
        invitee_email AS "inviteeEmail",
        invite_code AS "inviteCode",
        status,
        sent_at AS "sentAt",
        converted_at AS "convertedAt"
      FROM referral_invites
      WHERE inviter_user_id = $1
        AND LOWER(invitee_email) = LOWER($2)
      LIMIT 1
    `,
    [inviterUserId, email],
  )
}

export async function createReferralInvite(input: {
  inviterUserId: string
  inviterEmail?: string | null
  inviteeEmail: string
  inviteCode: string
  ipAddress?: string | null
}): Promise<ReferralInviteRecord> {
  const row = await queryOne<ReferralInviteRecord>(
    `
      INSERT INTO referral_invites (
        inviter_user_id,
        inviter_email,
        invitee_email,
        invite_code,
        last_sent_ip
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id::text,
        inviter_user_id AS "inviterUserId",
        inviter_email AS "inviterEmail",
        invitee_email AS "inviteeEmail",
        invite_code AS "inviteCode",
        status,
        sent_at AS "sentAt",
        converted_at AS "convertedAt"
    `,
    [input.inviterUserId, input.inviterEmail ?? null, input.inviteeEmail, input.inviteCode, input.ipAddress ?? null],
  )

  if (!row) {
    throw new Error("Failed to create referral invite")
  }

  return row
}

export async function listReferralInvitesForUser(inviterUserId: string, limit = 25): Promise<ReferralInviteRecord[]> {
  return queryMany<ReferralInviteRecord>(
    `
      SELECT
        id::text,
        inviter_user_id AS "inviterUserId",
        inviter_email AS "inviterEmail",
        invitee_email AS "inviteeEmail",
        invite_code AS "inviteCode",
        status,
        sent_at AS "sentAt",
        converted_at AS "convertedAt"
      FROM referral_invites
      WHERE inviter_user_id = $1
      ORDER BY sent_at DESC
      LIMIT $2
    `,
    [inviterUserId, limit],
  )
}

export async function createReferralConversion(input: {
  inviteId: string
  inviterUserId: string
  convertedUserId?: string | null
  conversionSource: string
}): Promise<ReferralConversionRecord | null> {
  return queryOne<ReferralConversionRecord>(
    `
      WITH updated AS (
        UPDATE referral_invites
          SET status = 'converted',
              converted_at = NOW()
        WHERE id = $1::bigint
          AND status = 'invited'
        RETURNING id, inviter_user_id
      )
      INSERT INTO referral_conversions (
        invite_id,
        inviter_user_id,
        converted_user_id,
        conversion_source
      )
      SELECT
        updated.id,
        updated.inviter_user_id,
        $2,
        $3
      FROM updated
      ON CONFLICT (invite_id) DO NOTHING
      RETURNING
        id::text,
        invite_id::text AS "inviteId",
        inviter_user_id AS "inviterUserId",
        converted_user_id AS "convertedUserId",
        conversion_source AS "conversionSource",
        created_at AS "createdAt"
    `,
    [input.inviteId, input.convertedUserId ?? null, input.conversionSource],
  )
}

export async function findReferralInviteByCode(inviteCode: string): Promise<ReferralInviteRecord | null> {
  return queryOne<ReferralInviteRecord>(
    `
      SELECT
        id::text,
        inviter_user_id AS "inviterUserId",
        inviter_email AS "inviterEmail",
        invitee_email AS "inviteeEmail",
        invite_code AS "inviteCode",
        status,
        sent_at AS "sentAt",
        converted_at AS "convertedAt"
      FROM referral_invites
      WHERE invite_code = $1
      LIMIT 1
    `,
    [inviteCode],
  )
}

export async function countReferralConversionsForUser(inviterUserId: string): Promise<number> {
  const row = await queryOne<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM referral_conversions WHERE inviter_user_id = $1`,
    [inviterUserId],
  )

  return Number(row?.total ?? "0")
}
