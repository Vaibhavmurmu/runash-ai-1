"use client"

import { useState } from "react"
import { Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: (payload: { score: number; reason: string }) => void
  restoreFocusTo?: HTMLElement | null
}

export function FeedbackModal({ open, onOpenChange, onSubmitted, restoreFocusTo }: FeedbackModalProps) {
  const [score, setScore] = useState("5")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resetState = () => {
    setScore("5")
    setReason("")
    setSubmitting(false)
    setError(null)
    setSuccess(null)
  }

  const submitFeedback = async () => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          score: Number(score),
          message: reason.trim() || "Dashboard feedback submitted",
          source: "dashboard",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      setSuccess("Thanks! Your feedback has been submitted.")
      onSubmitted?.({ score: Number(score), reason: reason.trim() || "Dashboard feedback submitted" })
      setTimeout(() => {
        onOpenChange(false)
        resetState()
      }, 800)
    } catch {
      setError("Unable to submit feedback right now. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetState()
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (restoreFocusTo) {
            event.preventDefault()
            restoreFocusTo.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Share feedback
          </DialogTitle>
          <DialogDescription>Help us improve your dashboard experience.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-score">Score (1-5)</Label>
            <Input
              id="feedback-score"
              type="number"
              min={1}
              max={5}
              value={score}
              onChange={(event) => setScore(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-reason">Feedback</Label>
            <Textarea
              id="feedback-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              placeholder="Tell us what is working well or what we should improve..."
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submitFeedback} disabled={submitting || Number(score) < 1 || Number(score) > 5}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
