"use client"

import { useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { WelcomeOnboardingModal } from "@/components/dashboard/onboarding/welcome-onboarding-modal"
import { DashboardStatePattern, type DashboardViewState } from "@/components/dashboard/dashboard-state-pattern"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardOnboardingPage() {
  const [showModal, setShowModal] = useState(false)
  const [completed, setCompleted] = useState(false)

  const state: DashboardViewState = useMemo(() => {
    if (!completed) return "empty"
    return "ready"
  }, [completed])

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <WelcomeOnboardingModal
        open={showModal}
        onSkip={() => setShowModal(false)}
        onComplete={() => {
          setCompleted(true)
          setShowModal(false)
        }}
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome onboarding</h1>
        <p className="text-sm text-muted-foreground">Guide first-time creators through workspace setup and project creation steps.</p>
      </div>

      <DashboardStatePattern
        state={state}
        title="Onboarding checklist"
        description="Start onboarding to activate the guided editor setup."
        emptyActionLabel="Start onboarding"
        onEmptyAction={() => setShowModal(true)}
      >
        <Card>
          <CardHeader>
            <CardTitle>Onboarding completed</CardTitle>
            <CardDescription>Your workspace now has baseline editor guidance enabled.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm">You can reopen onboarding anytime from this page.</span>
            <Badge variant="secondary">Ready</Badge>
            <Button variant="outline" className="ml-auto" onClick={() => setShowModal(true)}>
              Reopen onboarding
            </Button>
          </CardContent>
        </Card>
      </DashboardStatePattern>
    </div>
  )
}
