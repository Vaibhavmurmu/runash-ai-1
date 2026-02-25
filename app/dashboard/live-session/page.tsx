"use client"

import { useState } from "react"
import Link from "next/link"
import { PlayCircle, Radio } from "lucide-react"
import { DashboardStatePattern, type DashboardViewState } from "@/components/dashboard/dashboard-state-pattern"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardLiveSessionPage() {
  const [state, setState] = useState<DashboardViewState>("ready")

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Previous live session</h1>
        <p className="text-sm text-muted-foreground">Review your latest session and resume setup with one click.</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setState("loading")}>Set loading</Button>
        <Button variant="outline" size="sm" onClick={() => setState("error")}>Set error</Button>
        <Button variant="outline" size="sm" onClick={() => setState("empty")}>Set empty</Button>
        <Button variant="outline" size="sm" onClick={() => setState("ready")}>Set ready</Button>
      </div>

      <DashboardStatePattern
        state={state}
        title="Last session unavailable"
        description="We couldn't load your previous live context right now."
        onRetry={() => setState("ready")}
        emptyActionLabel="Start a new live session"
        onEmptyAction={() => setState("ready")}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Session overview
            </CardTitle>
            <CardDescription>Last live: 35 min duration • 1.2K viewers • setup saved 2 hours ago</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/stream?resume=last-live">
                <PlayCircle className="mr-2 h-4 w-4" />
                Resume previous live setup
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/analytics?replay=last-live">Replay session analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardStatePattern>
    </div>
  )
}
