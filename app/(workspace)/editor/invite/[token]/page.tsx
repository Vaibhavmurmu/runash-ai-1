"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function AcceptEditorInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = typeof params?.token === "string" ? params.token : ""
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = async () => {
    if (!token) return
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/editor/collaboration/invites/${encodeURIComponent(token)}/accept`, { method: "POST" })
      const payload = (await response.json()) as { projectId?: string; error?: string }

      if (!response.ok) {
        throw new Error(payload.error || "Failed to accept invite")
      }

      if (payload.projectId) {
        router.push(`/editor?projectId=${encodeURIComponent(payload.projectId)}`)
      } else {
        router.push("/editor")
      }
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept invite")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Editor collaboration invite</h1>
      <p className="text-sm text-muted-foreground">Accept this invite to join the shared editor project.</p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={() => void accept()} disabled={!token || isSubmitting}>
        {isSubmitting ? "Joining..." : "Accept invite"}
      </Button>
    </div>
  )
}
