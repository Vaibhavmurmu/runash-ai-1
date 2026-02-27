import type { Metadata } from "next"
import { MpcConnectionManager } from "@/components/dashboard/mcp-connection-manager"
import { ActionGrid, PageHeader, SectionShell, StatusCard } from "@/components/dashboard/workspace/common/page-primitives"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Connections",
  description: "Manage MCP connectors, tool discovery, permissions, and health checks.",
  path: "/dashboard/connections",
})

export default function ConnectionsPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        eyebrow="MCP runtime"
        title="Connector management and runtime controls"
        description="Configure MCP servers, set connector-level permissions, discover tools, and inspect fallback or audit behavior."
      />

      <SectionShell title="Workspace state patterns" description="Unified status blocks for integration lifecycle events.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard kind="loading" title="Loading connectors" description="Collecting connector health, tools, and permission policy snapshots." />
          <StatusCard
            kind="empty"
            title="No connectors configured"
            description="Add your first MCP connector to unlock tools and automation integrations."
          />
          <StatusCard
            kind="error"
            title="Health check failed"
            description="One or more connector probes returned errors. Review diagnostics before retrying."
            action={{ href: "/dashboard/documentation", label: "Open reliability docs" }}
          />
          <StatusCard
            kind="success"
            title="Connectors healthy"
            description="Runtime checks passed and connector permissions are synchronized."
          />
        </div>
      </SectionShell>

      <SectionShell title="Connection actions" description="Quick links for integration setup and operations.">
        <ActionGrid
          items={[
            {
              title: "Connector setup",
              description: "Open runtime controls to configure and validate MCP endpoints.",
              href: "/dashboard/connections",
              cta: "Manage connectors",
            },
            {
              title: "Integration docs",
              description: "Review auth contracts, retries, and operating runbooks before rollout.",
              href: "/dashboard/documentation",
              cta: "Read docs",
            },
          ]}
        />
      </SectionShell>

      <SectionShell title="MCP connection manager" description="Live controls for connector configuration, permissions, and health checks.">
        <MpcConnectionManager />
      </SectionShell>
    </div>
  )
}
