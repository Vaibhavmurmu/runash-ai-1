export type CommunityRegistrationAuditOutcome =
  | "unauthorized"
  | "invalid_request"
  | "invalid_event"
  | "registration_closed"
  | "already_registered"
  | "created"

export async function auditCommunityRegistrationAttempt(input: {
  actorUserId: string
  outcome: CommunityRegistrationAuditOutcome
  eventId?: string
  registrationId?: string
}) {
  console.info("[community_registration_audit]", {
    actorUserId: input.actorUserId,
    outcome: input.outcome,
    eventId: input.eventId,
    registrationId: input.registrationId,
  })
}
