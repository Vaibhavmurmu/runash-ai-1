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
    indexes: ["idx_users_email_unique_not_null"],
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
    indexes: ["idx_accounts_user_id", "idx_accounts_provider_account"],
    uniqueConstraints: ["provider_id,account_id"],
  },
  sessions: {
    table: "sessions",
    fields: ["id", "user_id", "token", "expires_at", "ip_address", "user_agent", "created_at", "updated_at"],
    indexes: ["idx_sessions_user_id", "idx_sessions_expires_at"],
    uniqueConstraints: ["token"],
  },
  verificationTokens: {
    table: "verification_tokens",
    fields: ["id", "identifier", "value", "expires_at", "created_at", "updated_at"],
    indexes: ["idx_verification_tokens_identifier", "idx_verification_tokens_expires_at"],
    uniqueConstraints: ["identifier,value"],
  },
  authSessionIdentities: {
    table: "auth_session_identities",
    fields: ["id", "user_id", "linked_user_id", "linked_at", "created_at"],
    indexes: ["idx_auth_session_identities_user_id", "idx_auth_session_identities_linked_user_id"],
    uniqueConstraints: ["user_id"],
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
    indexes: [
      "idx_auth_session_registry_user_last_seen",
      "idx_auth_session_registry_token_hash",
      "idx_auth_session_registry_status_expires",
    ],
    uniqueConstraints: ["user_id,scope,id"],
  },
  authOneTimeTransferTokens: {
    table: "auth_one_time_transfer_tokens",
    fields: ["id", "session_id", "token_hash", "source_domain", "target_domain", "consumed_at", "expires_at", "created_at"],
    indexes: ["idx_auth_transfer_tokens_hash", "idx_auth_transfer_tokens_session_id", "idx_auth_transfer_tokens_expires_at"],
    uniqueConstraints: ["token_hash"],
  },
} as const

export const appSchemaTables = {
  waitlistEntries: {
    table: "waitlist_entries",
    fields: ["id", "email", "name", "company", "use_case", "created_at"],
  },
  accountingChartOfAccounts: {
    table: "accounting_chart_of_accounts",
    fields: ["id", "code", "name", "account_type", "currency", "balance", "is_active", "created_at", "updated_at"],
  },
  accountingLedgerEntries: {
    table: "accounting_ledger_entries",
    fields: ["id", "entry_date", "voucher_code", "account_code", "debit", "credit", "narration", "created_at"],
  },
  accountingReconciliationItems: {
    table: "accounting_reconciliation_items",
    fields: ["id", "invoice_number", "tax_period", "status", "book_tax", "gst_portal_tax", "created_at", "updated_at"],
  },
  accountingCounterparties: {
    table: "accounting_counterparties",
    fields: ["id", "entity_type", "name", "gstin", "outstanding", "is_active", "created_at", "updated_at"],
  },
  shipments: {
    table: "shipments",
    fields: [
      "id",
      "order_id",
      "seller_user_id",
      "provider",
      "service_level",
      "status",
      "tracking_number",
      "tracking_url",
      "label_url",
      "package_weight_grams",
      "exception_reason",
      "last_synced_at",
      "created_at",
      "updated_at",
    ],
    indexes: ["idx_shipments_order_id", "idx_shipments_seller_user_id", "idx_shipments_tracking_number", "idx_shipments_status"],
  },
  shipmentTrackingEvents: {
    table: "shipment_tracking_events",
    fields: ["id", "shipment_id", "event_type", "event_code", "status", "location", "event_timestamp", "metadata", "created_at"],
    indexes: ["idx_shipment_tracking_events_shipment_id", "idx_shipment_tracking_events_timestamp"],
  },
  fulfillmentTasks: {
    table: "fulfillment_tasks",
    fields: [
      "id",
      "shipment_id",
      "task_type",
      "payload",
      "run_after",
      "status",
      "attempt_count",
      "last_error",
      "completed_at",
      "created_at",
      "updated_at",
    ],
    indexes: ["idx_fulfillment_tasks_run_after", "idx_fulfillment_tasks_shipment_id"],
  },
  agentRoleDecisions: {
    table: "agent_role_decisions",
    fields: [
      "id",
      "session_id",
      "message_id",
      "tenant_id",
      "agent_role",
      "tool_name",
      "decision_status",
      "objective_weights",
      "guardrails",
      "preferences",
      "outcome",
      "created_at",
    ],
  },
} as const

export type AuthSchemaTableName = keyof typeof authSchemaTables
export type AppSchemaTableName = keyof typeof appSchemaTables
