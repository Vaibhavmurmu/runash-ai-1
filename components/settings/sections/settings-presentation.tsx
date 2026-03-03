import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type SettingsStatus =
  | "ready"
  | "configured"
  | "recommended"
  | "review"
  | "active"
  | "trial"
  | "atRisk"
  | "pastDue"
  | "credits"

const STATUS_META: Record<SettingsStatus, { label: string; badgeVariant: "default" | "secondary" | "outline"; className?: string }> = {
  ready: { label: "Ready", badgeVariant: "outline" },
  configured: { label: "Configured", badgeVariant: "default" },
  recommended: { label: "Recommended", badgeVariant: "secondary" },
  review: { label: "Review", badgeVariant: "secondary" },
  active: { label: "Active", badgeVariant: "default" },
  trial: { label: "Trial", badgeVariant: "outline", className: "border-primary/45 text-primary" },
  atRisk: { label: "At risk", badgeVariant: "secondary", className: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  pastDue: { label: "Past due", badgeVariant: "secondary", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  credits: { label: "Available credits", badgeVariant: "outline", className: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" },
}

interface SettingsSectionCardProps {
  panelId?: string
  title: string
  description: string
  status: SettingsStatus
  children: ReactNode
}

export function SettingsSectionCard({ panelId, title, description, status, children }: SettingsSectionCardProps) {
  const meta = STATUS_META[status]

  return (
    <Card
      id={panelId ? `settings-panel-${panelId}` : undefined}
      data-settings-panel={panelId ?? undefined}
      className="scroll-mt-24 border-border/70 bg-card/95"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant={meta.badgeVariant} className={cn("font-medium", meta.className)}>
          {meta.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

interface SettingsRowProps {
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

export function SettingsRow({ title, description, className, children }: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-md border border-border/70 bg-background/60 p-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}

interface SettingsActionBarProps {
  primaryActionLabel: string
  onPrimaryAction: () => void
  disabled?: boolean
  children?: ReactNode
}

export function SettingsActionBar({ primaryActionLabel, onPrimaryAction, disabled = false, children }: SettingsActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2">
      <Button onClick={onPrimaryAction} disabled={disabled}>
        {primaryActionLabel}
      </Button>
      {children}
    </div>
  )
}
