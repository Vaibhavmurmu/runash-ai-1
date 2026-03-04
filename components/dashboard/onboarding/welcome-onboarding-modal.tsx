"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type WelcomeOnboardingModalProps = {
  open: boolean
  onSkip: () => void
  onComplete: () => void
  isSaving?: boolean
}

export function WelcomeOnboardingModal({ open, onSkip, onComplete, isSaving = false }: WelcomeOnboardingModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to your editor workspace</DialogTitle>
          <DialogDescription>
            We&apos;ll set up your first project in a few clicks. You can skip onboarding now and reopen guidance later from workspace help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>• Start with a blank timeline, import media, or use a starter template.</p>
          <p>• Upload clips directly into your active timeline and autosave changes.</p>
          <p>• Pick the best model for generation from the editor controls.</p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onSkip} disabled={isSaving}>
            Skip for now
          </Button>
          <Button onClick={onComplete} disabled={isSaving}>
            {isSaving ? "Saving..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
