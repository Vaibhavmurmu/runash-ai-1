import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Create Project",
  description: "Plan and bootstrap a new dashboard project workspace.",
  path: "/dashboard/create-project",
})

export default function CreateProjectPage() {
  return (
    <RoutePlanShell
      title="Create Project"
      description="Plan and bootstrap a new dashboard project workspace."
      status="In Progress"
      statusSummary="Project scaffolding checklist is active for this workspace route."
      emptyStateTitle="No project created yet"
      emptyStateDescription="Start by creating your first project and invite collaborators once the baseline is generated."
      primaryAction={{ label: "Start project setup", href: "/dashboard/projects/new" }}
      secondaryAction={{ label: "Browse templates", href: "/dashboard/templates" }}
    />
  )
}
