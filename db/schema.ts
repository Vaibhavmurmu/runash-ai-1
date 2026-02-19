/**
 * Placeholder Drizzle schema entrypoint.
 *
 * RunAsh currently executes production migrations with SQL assets in `scripts/sql`.
 * Keep this file as the canonical Drizzle schema anchor for phased rollout.
 */
export const drizzleSchemaStatus = {
  phase: "planned",
  sourceOfTruth: "scripts/sql",
} as const
