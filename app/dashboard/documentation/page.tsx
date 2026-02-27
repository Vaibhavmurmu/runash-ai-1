import type { Metadata } from "next"
import Link from "next/link"
import { BookMarked, Code2, Gauge, KeyRound, Webhook } from "lucide-react"
import { OpenApiAuthReference } from "@/components/dashboard/api/openapi-auth-reference"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createDashboardMetadata } from "../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Documentation",
  description: "Centralize operational runbooks and module documentation.",
  path: "/dashboard/documentation",
})

export default function DocumentationPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <section className="space-y-3">
        <Badge variant="secondary">API documentation hub</Badge>
        <h1 className="text-2xl font-semibold">Developer documentation and integration references</h1>
        <p className="text-sm text-muted-foreground">
          Browse OpenAPI auth endpoints, key lifecycle runbooks, webhook reliability guidance, and standardized error +
          rate-limit behavior.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookMarked className="h-4 w-4" /> OpenAPI source
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Use <code>docs/openapi/auth.openapi.json</code> as the contract source of truth.</CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Key management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/api">Create, revoke, list keys</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4" /> Webhook docs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Signature verification, retries, idempotency, and dead-letter handling patterns.</CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" /> Limits & errors
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Reference status codes and retry semantics before production launch.</CardContent>
        </Card>
      </section>

      <OpenApiAuthReference />

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="h-4 w-4" /> Developer CTA cards
          </CardTitle>
          <CardDescription>Quick links to keep docs and API management reachable from dashboard workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/api">Open API key manager</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/documentation">Open docs explorer</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/connections">Configure integrations</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
