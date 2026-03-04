"use client"

import { useEffect, useState } from "react"
import { TopLevelModuleLanding, type ModuleActivityItem, type ModuleSecondaryLink } from "@/components/dashboard/top-level-module-landing"
import { fetchApiData } from "@/lib/api/client"

type ApiActivity = {
  id?: string
  action?: string
  target?: string
  time?: string
}

interface TopLevelModulePageProps {
  title: string
  summary: string
  ctaLabel: string
  ctaHref: string
  secondaryLinks: ModuleSecondaryLink[]
  activityEndpoint?: string
}

export function TopLevelModulePage({
  title,
  summary,
  ctaLabel,
  ctaHref,
  secondaryLinks,
  activityEndpoint = "/api/dashboard/activity?limit=5",
}: TopLevelModulePageProps) {
  const [recentActivity, setRecentActivity] = useState<ModuleActivityItem[]>([])

  useEffect(() => {
    let mounted = true

    fetchApiData<ApiActivity[]>(activityEndpoint, {
      fallbackMessage: `Failed to load ${title.toLowerCase()} activity`,
    })
      .then((payload) => {
        if (!mounted || !Array.isArray(payload)) {
          return
        }

        setRecentActivity(
          payload.map((entry, index) => ({
            id: entry.id ?? `${title}-${index}`,
            label: [entry.action ?? "updated", entry.target ?? title].join(" "),
            time: entry.time ?? "Just now",
          })),
        )
      })
      .catch(() => {
        if (mounted) {
          setRecentActivity([])
        }
      })

    return () => {
      mounted = false
    }
  }, [activityEndpoint, title])

  return (
    <TopLevelModuleLanding
      title={title}
      summary={summary}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      recentActivity={recentActivity}
      secondaryLinks={secondaryLinks}
    />
  )
}
