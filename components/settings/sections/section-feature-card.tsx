import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SectionFeatureCardProps {
  panelId?: string
  title: string
  description: string
  status: "Ready" | "Configured" | "Recommended" | "Review" | "Active" | "Trial" | "At risk" | "Past due" | "Available credits"
  actionLabel: string
  disabled?: boolean
  onAction: () => void
  children?: ReactNode
}

export function SectionFeatureCard({
  panelId,
  title,
  description,
  status,
  actionLabel,
  disabled = false,
  onAction,
  children,
}: SectionFeatureCardProps) {
  return (
    <Card id={panelId ? `settings-panel-${panelId}` : undefined} data-settings-panel={panelId ?? undefined} className="scroll-mt-24">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant={status === "Review" || status === "At risk" || status === "Past due" ? "secondary" : "outline"}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <Button onClick={onAction} disabled={disabled}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
