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
  ecommerce: ["products", "orders", "order_items"],
  editor: [
    "editor_projects",
    "editor_timelines",
    "editor_tracks",
    "editor_assets",
    "editor_segments",
    "editor_render_jobs",
  ],
  dashboard: ["dashboard_stream_invites", "model_dialog_runs"],
  streamingStudio: [
    "stream_session_snapshots",
    "stream_follow_up_tasks",
    "stream_highlight_jobs",
  ],
  userSettings: ["user_settings", "user_setting_attachments", "user_settings_audit"],
} as const

export const dashboardSchemaMappings = {
  products: {
    table: "products",
    fields: [
      "id",
      "user_id",
      "name",
      "description",
      "price",
      "stock",
      "category",
      "status",
      "rating",
      "sales",
      "image",
      "row_version",
      "created_at",
      "updated_at",
    ],
  },
  orders: {
    table: "orders",
    fields: [
      "id",
      "user_id",
      "buyer_name",
      "buyer_email",
      "buyer_phone",
      "shipping_address",
      "payment_method",
      "status",
      "total",
      "row_version",
      "created_at",
      "updated_at",
    ],
  },
  orderItems: {
    table: "order_items",
    fields: ["id", "order_id", "product_id", "name", "quantity", "price"],
  },
  modelDialogRuns: {
    table: "model_dialog_runs",
    fields: ["id", "user_id", "model_id", "source_module", "input_summary", "status", "created_at", "updated_at"],
  },
} as const
