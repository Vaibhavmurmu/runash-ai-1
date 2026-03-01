import type { ReactNode } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, PackageOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p>
      </div>
    </header>
  )
}

interface SectionShellProps {
  title: string
  description: string
  children: ReactNode
}

export function SectionShell({ title, description, children }: SectionShellProps) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

type StatusKind = "loading" | "empty" | "error" | "success"

interface StatusCardProps {
  kind: StatusKind
  title: string
  description: string
  action?: { href: string; label: string; ariaLabel?: string }
}

const statusIcon = {
  loading: Loader2,
  empty: PackageOpen,
  error: AlertCircle,
  success: CheckCircle2,
} as const

const statusTone = {
  loading: "secondary",
  empty: "outline",
  error: "destructive",
  success: "default",
} as const

export function StatusCard({ kind, title, description, action }: StatusCardProps) {
  const Icon = statusIcon[kind]

  return (
    <Card className="border-border/60 bg-card/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={statusTone[kind]} className="capitalize">
            {kind}
          </Badge>
          <Icon className={`h-4 w-4 ${kind === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      {action ? (
        <CardContent>
          <Button asChild variant="outline" className="w-full justify-between">
            <Link href={action.href} aria-label={action.ariaLabel ?? action.label}>
              {action.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )
}

interface ActionItem {
  title: string
  description: string
  href: string
  cta: string
  ariaLabel?: string
}

interface ActionGridProps {
  items: ActionItem[]
}

export function ActionGrid({ items }: ActionGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.href} className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full justify-between" variant="outline">
              <Link href={item.href} aria-label={item.ariaLabel ?? item.cta}>
                {item.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
