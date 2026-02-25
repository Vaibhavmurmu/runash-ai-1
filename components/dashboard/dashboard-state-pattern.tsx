"use client"

import type { ReactNode } from "react"
import { AlertCircle, Inbox, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type DashboardViewState = "loading" | "error" | "empty" | "ready"

interface DashboardStatePatternProps {
  state: DashboardViewState
  title: string
  description: string
  onRetry?: () => void
  emptyActionLabel?: string
  onEmptyAction?: () => void
  children: ReactNode
}

export function DashboardStatePattern({
  state,
  title,
  description,
  onRetry,
  emptyActionLabel,
  onEmptyAction,
  children,
}: DashboardStatePatternProps) {
  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-44 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your workspace view...
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            We hit a temporary issue loading this page.
          </div>
          {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
        </CardContent>
      </Card>
    )
  }

  if (state === "empty") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex min-h-36 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
            <Inbox className="h-4 w-4" />
            Nothing to show yet.
          </div>
          {emptyActionLabel && onEmptyAction ? <Button onClick={onEmptyAction}>{emptyActionLabel}</Button> : null}
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
