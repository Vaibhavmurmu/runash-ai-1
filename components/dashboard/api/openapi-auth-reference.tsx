import {
  Activity,
  BadgeCheck,
  Clock3,
  KeyRound,
  Link2,
  RotateCw,
  ShieldCheck,
  Webhook,
} from "lucide-react"
import authOpenApi from "@/docs/openapi/auth.openapi.json"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const methodStyle: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  post: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  put: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  patch: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  delete: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

type OpenApiPathOperation = {
  operationId?: string
  summary?: string
  tags?: string[]
  responses?: Record<string, { description?: string }>
}

function buildEndpointRows() {
  const paths = authOpenApi.paths as Record<string, Record<string, OpenApiPathOperation>>

  return Object.entries(paths)
    .flatMap(([path, operations]) =>
      Object.entries(operations).map(([method, operation]) => ({
        path,
        method,
        summary: operation.summary ?? operation.operationId ?? "No summary",
        tag: operation.tags?.[0] ?? "General",
        responseCodes: Object.keys(operation.responses ?? {}).join(", ") || "200",
      })),
    )
    .sort((a, b) => a.path.localeCompare(b.path))
}

export function OpenApiAuthReference() {
  const endpoints = buildEndpointRows()
  const totalPaths = Object.keys(authOpenApi.paths).length

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>OpenAPI endpoint explorer</CardTitle>
          <CardDescription>
            Powered by <code>docs/openapi/auth.openapi.json</code> with path + method metadata from the auth contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{authOpenApi.info.title}</Badge>
            <Badge variant="outline">v{authOpenApi.info.version}</Badge>
            <Badge variant="outline">{totalPaths} paths</Badge>
            <Badge variant="outline">{endpoints.length} operations</Badge>
          </div>

          <div className="space-y-3">
            {endpoints.slice(0, 24).map((endpoint) => (
              <article
                key={`${endpoint.method}-${endpoint.path}`}
                className="rounded-lg border border-border/60 bg-background/70 p-3 dark:bg-card/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={methodStyle[endpoint.method] ?? "bg-slate-500/15 text-slate-700 dark:text-slate-300"}
                    >
                      {endpoint.method.toUpperCase()}
                    </Badge>
                    <code className="text-xs sm:text-sm">{endpoint.path}</code>
                    <Badge variant="outline">{endpoint.tag}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Responses: {endpoint.responseCodes}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{endpoint.summary}</p>
              </article>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Showing first 24 operations for readability. Use the full JSON contract for generated SDKs and CI validation.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> API key management
            </CardTitle>
            <CardDescription>Create, rotate, and revoke scoped keys without exposing live secrets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3 dark:bg-card/40">
              <p className="font-medium">Create key</p>
              <p className="text-muted-foreground">Name keys by service and environment. Example: <code>mobile-prod-read</code>.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3 dark:bg-card/40">
              <p className="font-medium">Rotate key</p>
              <p className="text-muted-foreground">Issue a replacement key, deploy it, verify traffic, then revoke the old key.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3 dark:bg-card/40">
              <p className="font-medium">Revoke key</p>
              <p className="text-muted-foreground">Immediately disable compromised keys and review related audit events.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4" /> Webhooks and delivery docs
            </CardTitle>
            <CardDescription>Use signed events with replay protection and retry-safe handlers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Validate request signature and timestamp before processing payloads.</p>
            <p>• Return 2xx only after persistence succeeds to avoid duplicate side effects.</p>
            <p>• Keep handlers idempotent because retries can happen for up to 24 hours.</p>
            <p>• Track delivery status and dead-letter retries in your observability stack.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Safe request playground
          </CardTitle>
          <CardDescription>
            Test requests in a sandbox-style composer. Secrets remain masked in preview and logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Endpoint</span>
              <Input value="/api/auth/sign-in/email" readOnly />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Authorization</span>
              <Input value="Bearer ••••••••••••••••" readOnly />
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-border/70 bg-background/70 p-4 text-sm dark:bg-card/40">
            <p className="font-medium">Request preview</p>
            <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">{`curl -X POST https://api.runash.ai/api/auth/sign-in/email \\
  -H "Authorization: Bearer ***masked***" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@runash.ai","password":"***masked***"}'`}</pre>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Secrets masked
            </Badge>
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" /> Rate-limit safe mode
            </Badge>
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3 w-3" /> Audit trail enabled
            </Badge>
          </div>

          <Button variant="outline" className="inline-flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Open full API console
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCw className="h-4 w-4" /> Rate limits & error codes
          </CardTitle>
          <CardDescription>Reference behavior for retries and circuit breakers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p><strong>429</strong> Too Many Requests · back off with jitter and retry.</p>
          <p><strong>401</strong> Unauthorized · refresh credentials or session token.</p>
          <p><strong>403</strong> Forbidden · check scopes for requested operation.</p>
          <p><strong>422</strong> Validation Error · inspect payload schema + required fields.</p>
          <p><strong>500</strong> Server Error · retry idempotent requests with capped exponential backoff.</p>
          <p><strong>503</strong> Service Unavailable · switch to fallback path and alert on-call.</p>
        </CardContent>
      </Card>
    </div>
  )
}
