import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Documentation",
  description: "Centralize operational runbooks and module documentation.",
  path: "/dashboard/documentation",
})

export default function DocumentationPage() {
  return (
    <RoutePlanShell
      title="Documentation"
      description="Centralize operational runbooks and module documentation."
      status="Ready"
      statusSummary="Documentation route is available for workspace knowledge capture."
      emptyStateTitle="No docs published"
      emptyStateDescription="Publish onboarding and operational docs for your team."
      primaryAction={{ label: "Use documentation templates", href: "/dashboard/templates" }}
      secondaryAction={{ label: "Design system docs", href: "/dashboard/design-system" }}
    />
  )
}
