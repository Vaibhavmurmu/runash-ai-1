/**
 * Drizzle schema anchor.
 *
 * Production migrations are currently maintained as SQL assets in `scripts/sql`.
 * Keep this file as the canonical registry of database-backed domains that routes depend on.
 */
export const drizzleSchemaStatus = {
  phase: "planned",
  sourceOfTruth: "scripts/sql",
} as const

export const databaseDomainTables = {
  editor: [
    "editor_projects",
    "editor_timelines",
    "editor_tracks",
    "editor_assets",
    "editor_segments",
    "editor_render_jobs",
  ],
  dashboard: ["dashboard_stream_invites", "model_dialog_runs"],
  userSettings: ["user_settings", "user_setting_attachments", "user_settings_audit"],
} as const

export const dashboardSchemaMappings = {
  modelDialogRuns: {
    table: "model_dialog_runs",
    fields: ["id", "user_id", "model_id", "source_module", "input_summary", "status", "created_at", "updated_at"],
  },
} as const
