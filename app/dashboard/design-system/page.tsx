import type { Metadata } from "next"
import { ActionGrid, PageHeader, SectionShell, StatusCard } from "@/components/dashboard/workspace/common/page-primitives"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Design System",
  description: "Review brand tokens, components, and interface standards.",
  path: "/dashboard/design-system",
})

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        eyebrow="Workspace modules"
        title="Design System"
        description="Review brand tokens, components, and interface standards."
      />

      <SectionShell title="Workspace state patterns" description="Consistent status rendering for design language governance.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard kind="loading" title="Loading tokens" description="Refreshing typography, spacing, and component token definitions." />
          <StatusCard
            kind="empty"
            title="No components documented"
            description="Add baseline component patterns so design reviews stay consistent."
            action={{ href: "/dashboard/documentation/workspace-ui-style-guide", label: "Open style guide" }}
          />
          <StatusCard
            kind="error"
            title="Token validation failed"
            description="A token bundle could not be validated. Check documentation and retry."
            action={{ href: "/dashboard/documentation", label: "Open docs" }}
          />
          <StatusCard
            kind="success"
            title="Design baseline healthy"
            description="Core primitives and usage guidance are published for dashboard contributors."
            action={{ href: "/dashboard/documentation/workspace-ui-style-guide", label: "Review primitives" }}
          />
        </div>
      </SectionShell>

      <SectionShell title="Design operations" description="Core actions for keeping components and standards up to date.">
        <ActionGrid
          items={[
            {
              title: "Write design docs",
              description: "Update naming and usage rationale for shared UI modules.",
              href: "/dashboard/documentation/workspace-ui-style-guide",
              cta: "Write internal guidance",
            },
            {
              title: "Review templates",
              description: "Ensure starter templates match design-system conventions.",
              href: "/dashboard/templates",
              cta: "Open templates",
            },
          ]}
        />
      </SectionShell>
    </div>
  )
}
