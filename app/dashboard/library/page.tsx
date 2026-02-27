import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Library",
  description: "Manage reusable assets, prompts, and shared workspace resources.",
  path: "/dashboard/library",
})

export default function LibraryPage() {
  return (
    <RoutePlanShell
      title="Library"
      description="Manage reusable assets, prompts, and shared workspace resources."
      status="Planned"
      statusSummary="Library indexing and governance controls are queued for this route."
      emptyStateTitle="Your library is empty"
      emptyStateDescription="Add assets to build a reusable content and prompt library for your team."
      primaryAction={{ label: "Add from templates", href: "/dashboard/templates" }}
      secondaryAction={{ label: "Open documentation", href: "/dashboard/documentation" }}
    />
  )
}
