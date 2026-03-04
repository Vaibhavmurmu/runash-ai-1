import Link from "next/link"
import { ArrowRight, PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RoutePlanShellProps {
  title: string
  description: string
  status: "Planned" | "In Progress" | "Ready"
  statusSummary: string
  emptyStateTitle: string
  emptyStateDescription: string
  primaryAction: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
}

export function RoutePlanShell({
  title,
  description,
  status,
  statusSummary,
  emptyStateTitle,
  emptyStateDescription,
  primaryAction,
  secondaryAction,
}: RoutePlanShellProps) {
  return (
    <div className="w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>{statusSummary}</CardDescription>
          </div>
          <Badge variant={status === "Ready" ? "default" : "secondary"}>{status}</Badge>
        </CardHeader>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>{emptyStateTitle}</CardTitle>
          <CardDescription>{emptyStateDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={primaryAction.href}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {primaryAction.label}
            </Link>
          </Button>
          {secondaryAction ? (
            <Button variant="outline" asChild>
              <Link href={secondaryAction.href}>
                {secondaryAction.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
