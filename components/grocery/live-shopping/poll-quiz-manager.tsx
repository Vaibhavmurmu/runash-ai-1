"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Vote } from "lucide-react"

export type PollQuizKind = "poll" | "quiz"
export type PollQuizStatus = "draft" | "live" | "closed"

export interface PollQuizOption {
  id: string
  text: string
  votes: number
  isCorrect?: boolean
}

export interface PollQuizItem {
  id: string
  streamId: string
  kind: PollQuizKind
  question: string
  options: PollQuizOption[]
  status: PollQuizStatus
  createdAt: number
}

export interface PollQuizManagerProps {
  streamId: string
}

function toPercent(votes: number, totalVotes: number): string {
  if (totalVotes === 0) return "0%"
  return `${Math.round((votes / totalVotes) * 100)}%`
}

export default function PollQuizManager({ streamId }: PollQuizManagerProps) {
  const [items, setItems] = useState<PollQuizItem[]>([])
  const [question, setQuestion] = useState("")
  const [kind, setKind] = useState<PollQuizKind>("poll")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [loading, setLoading] = useState(false)

  const liveItem = useMemo(() => items.find((item) => item.status === "live") ?? null, [items])

  useEffect(() => {
    let source: EventSource | null = null

    const load = async () => {
      const response = await fetch(`/api/streams/${streamId}/polls`, { cache: "no-store" })
      if (response.ok) {
        const payload = await response.json()
        setItems(payload.items ?? [])
      }

      source = new EventSource(`/api/streams/${streamId}/polls/sse`)
      source.onmessage = (event) => {
        const payload = JSON.parse(event.data)
        if (payload?.type === "polls" && Array.isArray(payload.data)) {
          setItems(payload.data)
        }
      }
    }

    void load()

    return () => {
      source?.close()
    }
  }, [streamId])

  const createPollQuiz = async () => {
    const trimmedQuestion = question.trim()
    const filteredOptions = options.map((option) => option.trim()).filter(Boolean)
    if (!trimmedQuestion || filteredOptions.length < 2) {
      return
    }

    setLoading(true)
    const response = await fetch(`/api/streams/${streamId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        question: trimmedQuestion,
        options: filteredOptions.map((option, index) => ({ text: option, isCorrect: kind === "quiz" && index === 0 })),
      }),
    })

    setLoading(false)
    if (response.ok) {
      setQuestion("")
      setOptions(["", ""])
    }
  }

  const updateLifecycle = async (pollId: string, action: "start" | "close") => {
    await fetch(`/api/streams/${streamId}/polls/${pollId}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
  }

  const vote = async (pollId: string, optionId: string) => {
    await fetch(`/api/streams/${streamId}/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Polls & Quizzes</span>
          <Badge variant="secondary">{items.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex gap-2">
            <Button variant={kind === "poll" ? "default" : "outline"} onClick={() => setKind("poll")}>Poll</Button>
            <Button variant={kind === "quiz" ? "default" : "outline"} onClick={() => setKind("quiz")}>Quiz</Button>
          </div>
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask your audience a question" />
          <div className="space-y-2">
            {options.map((option, index) => (
              <Input
                key={`option-${index}`}
                value={option}
                onChange={(event) =>
                  setOptions((previous) => previous.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                }
                placeholder={`Option ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOptions((previous) => [...previous, ""])} disabled={options.length >= 6}>
              Add Option
            </Button>
            <Button onClick={createPollQuiz} disabled={loading}>
              Create {kind}
            </Button>
          </div>
        </div>

        {liveItem && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Live now: {liveItem.question}</div>
            {liveItem.options.map((option) => {
              const totalVotes = liveItem.options.reduce((sum, entry) => sum + entry.votes, 0)
              return (
                <div key={option.id} className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => vote(liveItem.id, option.id)}>
                    <Vote className="h-3 w-3 mr-1" />
                    {option.text}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {option.votes} votes ({toPercent(option.votes, totalVotes)})
                  </span>
                </div>
              )
            })}
            <Button variant="destructive" size="sm" onClick={() => updateLifecycle(liveItem.id, "close")}>
              <Square className="h-3 w-3 mr-1" />
              Close
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{item.question}</div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{item.kind.toUpperCase()}</div>
              {item.status === "draft" && (
                <Button size="sm" className="mt-2" onClick={() => updateLifecycle(item.id, "start")}>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
