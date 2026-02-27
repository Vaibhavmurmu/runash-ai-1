import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { MpcConnectionManager } from "@/components/dashboard/mcp-connection-manager"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Connections",
  description: "Manage MCP connectors, tool discovery, permissions, and health checks.",
  path: "/dashboard/connections",
})

export default function ConnectionsPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <section className="space-y-3">
        <Badge variant="secondary">MCP runtime</Badge>
        <h1 className="text-2xl font-semibold">Connector management and runtime controls</h1>
        <p className="text-sm text-muted-foreground">
          Configure MCP servers, set connector-level permissions, discover tools, and inspect fallback/audit behavior.
        </p>
      </section>
      <MpcConnectionManager />
    </div>
  )
}
