"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Mic, Send, Search, FileText, OctagonX, RotateCcw } from "lucide-react"
import debounce from "lodash.debounce"

type StreamControllerState = "idle" | "sending" | "streaming" | "stopping" | "failed"
type ComposerHealthState = "ready" | "usage-limit" | "provider-error" | "network-timeout"

type Props = {
  initial?: string
  onSend: (text: string) => void
  onUpload?: (fileMeta: { id: number; filename: string }) => void
  model?: string
  onModelChange?: (model: string) => void
  streamState?: StreamControllerState
  composerHealth?: ComposerHealthState
  onStop?: () => void
  onRetry?: () => void
}

export default function ChatInput({ initial = "", onSend, onUpload, model = "gpt-4o-mini", onModelChange, streamState = "idle", composerHealth = "ready", onStop, onRetry }: Props) {
  const [value, setValue] = useState(initial)
  const [isRecording, setIsRecording] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedModel, setSelectedModel] = useState(model)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [tone, setTone] = useState<"balanced" | "friendly" | "professional">("balanced")
  const [detail, setDetail] = useState<"concise" | "normal" | "detailed">("normal")

  useEffect(() => {
    setValue(initial)
  }, [initial])

  useEffect(() => {
    if (onModelChange) onModelChange(selectedModel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel])

  const fetchSuggestions = debounce(async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([])
      return
    }
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=5`)
      if (!res.ok) return
      const data = await res.json()
      setSuggestions((data || []).map((p: any) => p.name || p.title).filter(Boolean))
      setShowSuggestions(true)
    } catch (err) {
      console.warn("suggestions error", err)
    }
  }, 300)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    fetchSuggestions(e.target.value)
  }

  async function handleSend() {
    if (!value.trim()) return
    onSend(`${value.trim()}\n\n[Style] tone:${tone}; detail:${detail}`)
    setValue("")
    setSuggestions([])
    setShowSuggestions(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault()
      void enhancePrompt()
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function triggerFile() {
    fileInputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const buffer = await f.arrayBuffer()
      const b64 = Buffer.from(buffer).toString("base64")
      // call upload endpoint
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, mimeType: f.type, base64: b64 }),
      })
      if (!res.ok) throw new Error("upload failed")
      const data = await res.json()
      if (onUpload && data?.upload) onUpload({ id: data.upload.id, filename: data.upload.filename })
      // optionally insert file link text into prompt
      setValue((v) => v + ` [uploaded:${data.upload.id}] `)
    } catch (err) {
      console.error("file upload error", err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Voice using Web Speech API (simple)
  function toggleRecording() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("SpeechRecognition not supported in this browser")
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      setValue((v) => (v ? v + " " + text : text))
      // auto-send if desired
      // onSend(text)
    }
    recognition.onend = () => setIsRecording(false)
    if (!isRecording) {
      setIsRecording(true)
      recognition.start()
    } else {
      recognition.stop()
      setIsRecording(false)
    }
  }

  async function enhancePrompt() {
    if (!value.trim()) return
    try {
      const res = await fetch("/api/prompts/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, length: "medium" }),
      })
      if (!res.ok) throw new Error("enhance failed")
      const data = await res.json()
      if (data?.enhanced) setValue(data.enhanced)
    } catch (err) {
      console.error("enhance error", err)
    }
  }

  return (
    <div className="p-4 border-t">
      <div className="flex items-center gap-2">
        {composerHealth !== "ready" ? (
          <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900" role="status" aria-live="polite">
            {composerHealth === "usage-limit" ? "Usage limit reached." : null}
            {composerHealth === "provider-error" ? "Provider temporarily unavailable." : null}
            {composerHealth === "network-timeout" ? "Network timeout." : null}
            {onRetry ? (
              <button type="button" className="ml-2 inline-flex items-center underline" onClick={onRetry}>
                <RotateCcw className="mr-1 h-3 w-3" /> Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            title="Model"
          >
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
          <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="border rounded px-2 py-1 text-sm" title="Tone">
            <option value="balanced">Balanced</option>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
          </select>
        </div>

        <div className="flex-1">
          <Input
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products, recipes, or start a live demo..."
            className="flex-1"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-white border mt-1 rounded shadow-sm z-50">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="p-2 text-sm hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setValue(s)
                    setShowSuggestions(false)
                  }}
                >
                  <Search className="inline-block mr-2" />
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1" role="group" aria-label="Output detail level">
            {(["concise", "normal", "detailed"] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={`rounded border px-2 py-1 text-xs ${detail === level ? "bg-slate-900 text-white" : "bg-white"}`}
                onClick={() => setDetail(level)}
                aria-pressed={detail === level}
              >
                {level}
              </button>
            ))}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
          <Button variant="ghost" onClick={triggerFile} title="Upload file">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={toggleRecording} title="Voice (browser)">
            <Mic className={`h-4 w-4 ${isRecording ? "text-red-500" : ""}`} />
          </Button>
          <Button variant="ghost" onClick={enhancePrompt} title="Enhance prompt">
            <FileText className="h-4 w-4" />
          </Button>
          {(streamState === "sending" || streamState === "streaming") && onStop ? (
            <Button variant="outline" onClick={onStop} title="Stop generation">
              <OctagonX className="h-4 w-4" />
            </Button>
          ) : null}
          <Button onClick={handleSend} className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
