"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface ModuleActivityItem {
  id: string
  label: string
  time: string
}

export interface ModuleSecondaryLink {
  label: string
  href: string
}

interface TopLevelModuleLandingProps {
  title: string
  summary: string
  ctaLabel: string
  ctaHref: string
  recentActivity: ModuleActivityItem[]
  secondaryLinks: ModuleSecondaryLink[]
}

export function TopLevelModuleLanding({
  title,
  summary,
  ctaLabel,
  ctaHref,
  recentActivity,
  secondaryLinks,
}: TopLevelModuleLandingProps) {
  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
              <CardDescription className="mt-1 text-sm">{summary}</CardDescription>
            </div>
            <Badge variant="secondary">Top-level module</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Advanced controls live in secondary pages: {" "}
            {secondaryLinks.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? " · " : null}
                <Link href={link.href} className="underline underline-offset-2 hover:text-foreground">
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        </CardContent>
      </Card>

      <div>
        <Button asChild className="bg-brand-gradient shadow-sm transition-opacity hover:opacity-95 focus-visible:ring-brand-ring">
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.slice(0, 5).map((item) => (
            <div key={item.id} className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-sm">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
          ))}
          {recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
