"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { FeedbackModal } from "@/components/dashboard/feedback-modal"
import { DashboardStatePattern, type DashboardViewState } from "@/components/dashboard/dashboard-state-pattern"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardFeedbackPage() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<DashboardViewState>("empty")
  const [lastSubmission, setLastSubmission] = useState<{ score: number; reason: string } | null>(null)

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <FeedbackModal
        open={open}
        onOpenChange={setOpen}
        onSubmitted={(payload) => {
          setLastSubmission(payload)
          setState("ready")
        }}
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">Share product feedback and monitor submission status.</p>
      </div>

      <DashboardStatePattern
        state={state}
        title="No feedback submitted"
        description="Open the feedback modal to send comments to the RunAsh team."
        emptyActionLabel="Open feedback modal"
        onEmptyAction={() => setOpen(true)}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Submission status
            </CardTitle>
            <CardDescription>Latest feedback event from your dashboard workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Score: {lastSubmission?.score ?? "n/a"}</p>
            <p className="text-muted-foreground">{lastSubmission?.reason ?? "No reason captured yet."}</p>
            <Button variant="outline" onClick={() => setOpen(true)}>Submit more feedback</Button>
          </CardContent>
        </Card>
      </DashboardStatePattern>
    </div>
  )
}
