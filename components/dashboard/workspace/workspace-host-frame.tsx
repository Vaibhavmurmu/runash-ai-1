"use client"

import type { ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface WorkspaceHostFrameProps {
  title: string
  description: string
  children: ReactNode
  openInfo: boolean
  onOpenInfoChange: (open: boolean) => void
}

export function WorkspaceHostFrame({
  title,
  description,
  children,
  openInfo,
  onOpenInfoChange,
}: WorkspaceHostFrameProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenInfoChange(true)}>
            Workspace info
          </Button>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      <Dialog open={openInfo} onOpenChange={onOpenInfoChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This module is mounted inside the canonical dashboard shell so you can switch sections without leaving
            dashboard context.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
