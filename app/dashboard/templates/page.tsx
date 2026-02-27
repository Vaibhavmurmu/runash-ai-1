import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Templates",
  description: "Start faster with reusable dashboard templates and starter packs.",
  path: "/dashboard/templates",
})

export default function TemplatesPage() {
  return (
    <RoutePlanShell
      title="Templates"
      description="Start faster with reusable dashboard templates and starter packs."
      status="Ready"
      statusSummary="Template catalog route is available for project bootstrapping."
      emptyStateTitle="No templates pinned"
      emptyStateDescription="Pin templates to speed up new project creation."
      primaryAction={{ label: "Create project from template", href: "/dashboard/create-project" }}
      secondaryAction={{ label: "Open library", href: "/dashboard/library" }}
    />
  )
}
