"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"

type PollOption = {
  id: string
  label: string
  votes: number
}

type LivePoll = {
  id: string
  question: string
  options: PollOption[]
  status: "active" | "ended"
}

type PollQuizManagerProps = {
  streamId: string
  isHost?: boolean
}

export default function PollQuizManager({ streamId, isHost = false }: PollQuizManagerProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [polls, setPolls] = useState<LivePoll[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const activePoll = useMemo(() => polls.find((poll) => poll.status === "active"), [polls])

  const fetchPolls = async () => {
    const response = await fetch(`/api/streams/${streamId}/polls`, { cache: "no-store" })
    if (!response.ok) return
    const payload = (await response.json()) as { polls: LivePoll[] }
    setPolls(payload.polls ?? [])
  }

  useEffect(() => {
    fetchPolls()
    const timer = window.setInterval(fetchPolls, 6000)
    return () => window.clearInterval(timer)
  }, [streamId])

  const createPoll = async () => {
    const normalizedOptions = options.map((option) => option.trim()).filter(Boolean)
    if (!question.trim() || normalizedOptions.length < 2) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/streams/${streamId}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          options: normalizedOptions,
        }),
      })

      if (response.ok) {
        setQuestion("")
        setOptions(["", ""])
        await fetchPolls()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const vote = async (optionId: string) => {
    if (!activePoll) return

    await fetch(`/api/streams/${streamId}/polls/${activePoll.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    })
    await fetchPolls()
  }

  const endPoll = async () => {
    if (!activePoll || !isHost) return

    await fetch(`/api/streams/${streamId}/polls/${activePoll.id}/end`, {
      method: "POST",
    })
    await fetchPolls()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Polls</CardTitle>
        <CardDescription>Create quick audience polls and view real-time results.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isHost && (
          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="poll-question">Poll question</Label>
              <Input
                id="poll-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What should we feature next?"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {options.map((option, index) => (
                <Input
                  key={index}
                  value={option}
                  placeholder={`Option ${index + 1}`}
                  onChange={(event) => {
                    setOptions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOptions((prev) => (prev.length >= 6 ? prev : [...prev, ""]))}
              >
                Add Option
              </Button>
              <Button type="button" onClick={createPoll} disabled={isSaving || !!activePoll}>
                Create Poll
              </Button>
            </div>
          </div>
        )}

        {!activePoll && <p className="text-sm text-muted-foreground">No active poll right now.</p>}

        {activePoll && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{activePoll.question}</h4>
              <Badge variant="secondary">Live</Badge>
            </div>

            <div className="space-y-2">
              {activePoll.options.map((option) => {
                const total = activePoll.options.reduce((sum, current) => sum + current.votes, 0)
                const percentage = total === 0 ? 0 : Math.round((option.votes / total) * 100)

                return (
                  <div key={option.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{option.label}</span>
                      <span>{option.votes} votes · {percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <Button size="sm" variant="outline" onClick={() => vote(option.id)}>
                      Vote
                    </Button>
                  </div>
                )
              })}
            </div>

            {isHost && (
              <Button type="button" variant="destructive" onClick={endPoll}>
                End Poll
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
