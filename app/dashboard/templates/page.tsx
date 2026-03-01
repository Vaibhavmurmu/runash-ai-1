import type { Metadata } from "next"
import { ActionGrid, PageHeader, SectionShell, StatusCard } from "@/components/dashboard/workspace/common/page-primitives"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Templates",
  description: "Start faster with reusable dashboard templates and starter packs.",
  path: "/dashboard/templates",
})

export default function TemplatesPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        eyebrow="Workspace modules"
        title="Templates"
        description="Start faster with reusable dashboard templates and starter packs."
      />

      <SectionShell title="Workspace state patterns" description="Shared loading, empty, error, and success states for template workflows.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard kind="loading" title="Loading templates" description="Fetching starter kits and usage metadata for this workspace." />
          <StatusCard
            kind="empty"
            title="No templates pinned"
            description="Pin templates to speed up project creation and onboarding consistency."
            action={{ href: "/dashboard/library", label: "Browse template library", ariaLabel: "Browse template library for pinned starter kits" }}
          />
          <StatusCard
            kind="error"
            title="Template sync failed"
            description="We could not load your latest template inventory. Retry from the template library."
            action={{ href: "/dashboard/library", label: "Retry sync" }}
          />
          <StatusCard
            kind="success"
            title="Templates ready"
            description="Your starter catalog is active and can be used to create new projects."
            action={{ href: "/dashboard/create-project", label: "Create from template" }}
          />
        </div>
      </SectionShell>

      <SectionShell title="Template actions" description="Common actions that keep teams moving from concept to workspace setup.">
        <ActionGrid
          items={[
            {
              title: "Create project",
              description: "Start a new project by applying a starter template.",
              href: "/dashboard/create-project",
              cta: "Create project from template",
            },
            {
              title: "Open library",
              description: "Browse all available internal and shared template packs.",
              href: "/dashboard/library",
              cta: "Open library",
            },
          ]}
        />
      </SectionShell>
    </div>
  )
}
