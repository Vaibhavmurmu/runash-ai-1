import { randomBytes } from "crypto"
import { sendReferralInviteEmail, sendReferralMilestoneEmail } from "@/lib/email"
import { queryOne } from "@/lib/db"
import {
  countReferralConversionsForUser,
  createReferralConversion,
  createReferralInvite,
  findReferralInviteByCode,
  findReferralInviteByInviterAndEmail,
  listReferralInvitesForUser,
} from "@/lib/repositories/referrals"
import type { ReferralConversionInput, ReferralInviteInput } from "@/lib/validations/referrals"

const milestoneSet = new Set([1, 3, 5, 10])

function buildReferralCode() {
  return randomBytes(6).toString("hex")
}


async function getUserIdentity(userId: string) {
  return queryOne<{ email: string | null; name: string | null }>(
    `SELECT email, name FROM users WHERE id::text = $1 LIMIT 1`,
    [userId],
  )
}

export async function inviteReferral(input: {
  inviterUserId: string
  inviterEmail?: string | null
  inviterName?: string | null
  ipAddress?: string | null
  data: ReferralInviteInput
}) {
  const existing = await findReferralInviteByInviterAndEmail(input.inviterUserId, input.data.email)
  if (existing) {
    return { status: "duplicate" as const, invite: existing }
  }

  const invite = await createReferralInvite({
    inviterUserId: input.inviterUserId,
    inviterEmail: input.inviterEmail,
    inviteeEmail: input.data.email,
    inviteCode: buildReferralCode(),
    ipAddress: input.ipAddress,
  })

  await sendReferralInviteEmail({
    to: input.data.email,
    inviteCode: invite.inviteCode,
    inviterName: input.inviterName,
  })

  return { status: "created" as const, invite }
}

export async function getReferralStatus(inviterUserId: string) {
  const invites = await listReferralInvitesForUser(inviterUserId, 25)
  const totalConversions = await countReferralConversionsForUser(inviterUserId)

  return {
    totalInvites: invites.length,
    totalConversions,
    invites,
  }
}

export async function registerReferralConversion(input: {
  data: ReferralConversionInput
  convertedUserId?: string | null
}) {
  const invite = await findReferralInviteByCode(input.data.inviteCode)
  if (!invite) {
    return { status: "not_found" as const }
  }

  const conversion = await createReferralConversion({
    inviteId: invite.id,
    inviterUserId: invite.inviterUserId,
    convertedUserId: input.convertedUserId,
    conversionSource: input.data.conversionSource,
  })

  if (!conversion) {
    return { status: "already_converted" as const, invite }
  }

  const totalConversions = await countReferralConversionsForUser(invite.inviterUserId)
  if (milestoneSet.has(totalConversions)) {
    const inviter = await getUserIdentity(invite.inviterUserId)
    if (inviter?.email) {
      await sendReferralMilestoneEmail({
        to: inviter.email,
        name: inviter.name,
        totalConversions,
      })
    }
  }

  return {
    status: "converted" as const,
    invite,
    conversion,
    totalConversions,
  }
}
