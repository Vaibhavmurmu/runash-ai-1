/**
 * Database schema registry used by auth/session infrastructure.
 *
 * SQL migrations remain the source of truth for DDL. This file mirrors
 * canonical table/column names so app code can import a single schema map.
 */
export const drizzleSchemaStatus = {
  phase: "active",
  sourceOfTruth: "db/migrations + scripts/sql",
} as const

export const authSchemaTables = {
  users: {
    table: "users",
    fields: ["id", "name", "email", "email_verified", "image", "created_at", "updated_at"],
  },
  accounts: {
    table: "accounts",
    fields: [
      "id",
      "user_id",
      "account_id",
      "provider_id",
      "access_token",
      "refresh_token",
      "id_token",
      "access_token_expires_at",
      "refresh_token_expires_at",
      "scope",
      "password",
      "created_at",
      "updated_at",
    ],
  },
  sessions: {
    table: "sessions",
    fields: ["id", "user_id", "token", "expires_at", "ip_address", "user_agent", "created_at", "updated_at"],
  },
  verificationTokens: {
    table: "verification_tokens",
    fields: ["id", "identifier", "value", "expires_at", "created_at", "updated_at"],
  },
  authSessionRegistry: {
    table: "auth_session_registry",
    fields: [
      "id",
      "user_id",
      "mode",
      "scope",
      "status",
      "linked_from_session_id",
      "token_hash",
      "device_metadata",
      "created_at",
      "last_seen_at",
      "invalidated_at",
      "expires_at",
      "rotation_due_at",
    ],
  },
  authOneTimeTransferTokens: {
    table: "auth_one_time_transfer_tokens",
    fields: ["id", "session_id", "token_hash", "source_domain", "target_domain", "consumed_at", "expires_at", "created_at"],
  },
} as const

export type AuthSchemaTableName = keyof typeof authSchemaTables
