import type { Metadata } from "next"
import { RoutePlanShell } from "@/components/dashboard/route-plan-shell"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Design System",
  description: "Review brand tokens, components, and interface standards.",
  path: "/dashboard/design-system",
})

export default function DesignSystemPage() {
  return (
    <RoutePlanShell
      title="Design System"
      description="Review brand tokens, components, and interface standards."
      status="Planned"
      statusSummary="Design-system governance pages are staged under this route."
      emptyStateTitle="No components documented"
      emptyStateDescription="Document your component patterns for a consistent UI language."
      primaryAction={{ label: "Write design docs", href: "/dashboard/documentation" }}
      secondaryAction={{ label: "Open UI templates", href: "/dashboard/templates" }}
    />
  )
}
