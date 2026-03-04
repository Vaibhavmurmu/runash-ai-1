import type { Metadata } from "next"
import Link from "next/link"
import { createDashboardMetadata } from "../metadata"
import { ApiManagementPanel } from "@/components/dashboard/api/api-management-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = createDashboardMetadata({
  title: "API Access",
  description: "API key lifecycle, endpoint explorer, and error references.",
  path: "/dashboard/api",
})

export default function ApiPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <section className="space-y-3">
        <Badge variant="secondary">Developer platform</Badge>
        <h1 className="text-2xl font-semibold">API management and docs portal</h1>
        <p className="text-sm text-muted-foreground">
          Create, rotate, revoke, and scope keys. Run safe explorer requests and reference standardized error handling.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/documentation">Open OpenAPI docs</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/connections">Configure MCP connectors</Link>
          </Button>
        </div>
      </section>

      <ApiManagementPanel />
    </div>
  )
}
