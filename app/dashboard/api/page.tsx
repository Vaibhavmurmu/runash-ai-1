import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, KeySquare, LifeBuoy, RefreshCw, Shield } from "lucide-react"
import { OpenApiAuthReference } from "@/components/dashboard/api/openapi-auth-reference"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "API Access",
  description: "Create and manage API credentials for dashboard integrations.",
  path: "/dashboard/api",
})

const keyInventory = [
  {
    name: "payments-prod-write",
    scopes: ["payments:charges.write", "webhooks:read"],
    status: "Active",
    usage: "2.1k requests / 24h",
    rotatedAt: "14 days ago",
  },
  {
    name: "analytics-readonly",
    scopes: ["analytics:read", "usage:read"],
    status: "Active",
    usage: "680 requests / 24h",
    rotatedAt: "5 days ago",
  },
  {
    name: "legacy-mobile-key",
    scopes: ["auth:read"],
    status: "Needs rotation",
    usage: "No calls in 30 days",
    rotatedAt: "91 days ago",
  },
]

export default function ApiPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <section className="space-y-3">
        <Badge variant="secondary">Developer platform</Badge>
        <h1 className="text-2xl font-semibold">API keys, scopes, and endpoint docs</h1>
        <p className="text-sm text-muted-foreground">
          Manage key lifecycle (create, list, revoke), inspect scope assignments, and test auth endpoints safely with
          masked secret previews.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {keyInventory.map((key) => (
          <Card key={key.name} className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeySquare className="h-4 w-4" /> {key.name}
              </CardTitle>
              <CardDescription>{key.usage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {key.scopes.map((scope) => (
                  <Badge key={scope} variant="outline">
                    {scope}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p>Status: {key.status}</p>
                <p>Last rotated: {key.rotatedAt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline">
                  Rotate
                </Button>
                <Button size="sm" variant="ghost">
                  Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Rotation guidance</CardTitle>
          <CardDescription>Use a zero-downtime key rotation sequence for integrations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-card/40">
            <p className="font-medium">1) Create replacement key</p>
            <p className="text-muted-foreground">Mirror scopes from the old key and tag with environment + service.</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-card/40">
            <p className="font-medium">2) Deploy + verify</p>
            <p className="text-muted-foreground">Ship the new key, monitor usage, and validate webhook delivery.</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-card/40">
            <p className="font-medium">3) Revoke previous key</p>
            <p className="text-muted-foreground">Disable old key after stable traffic window and incident-free checks.</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3 dark:bg-card/40">
            <p className="font-medium">4) Keep audit evidence</p>
            <p className="text-muted-foreground">Retain rotation ticket, owner, and timestamp for compliance reviews.</p>
          </div>
        </CardContent>
      </Card>

      <OpenApiAuthReference />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Security baseline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Never expose raw API keys in logs, screenshots, or ticket payloads.</CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" /> Developer docs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/documentation">Open API + webhook docs</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> MCP connectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/connections">Manage MCP runtime connections</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LifeBuoy className="h-4 w-4" /> Need help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/support">Contact developer support</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" /> API access area now includes docs explorer, key lifecycle controls, webhook notes,
        and safe request playground references.
      </div>
    </div>
  )
}
