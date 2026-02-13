import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SectionFeatureCardProps {
  title: string
  description: string
  status: "Ready" | "Configured" | "Recommended" | "Review"
  actionLabel: string
  disabled?: boolean
  onAction: () => void
  children?: ReactNode
}

export function SectionFeatureCard({
  title,
  description,
  status,
  actionLabel,
  disabled = false,
  onAction,
  children,
}: SectionFeatureCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant={status === "Review" ? "secondary" : "outline"}>{status}</Badge>
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
