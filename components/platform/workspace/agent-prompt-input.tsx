"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Send, Mic, Plus, Sparkles, ImageIcon, Video } from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentPromptInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export default function AgentPromptInput({ onSendMessage, isLoading }: AgentPromptInputProps) {
  const [input, setInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const suggestions = [
    { icon: Sparkles, text: "Enhance this prompt" },
    { icon: Video, text: "Generate video" },
    { icon: ImageIcon, text: "Create thumbnail" },
  ]

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border bg-card p-4 space-y-3">
      {/* Suggestions Carousel */}
      {showSuggestions && input === "" && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {suggestions.map((suggestion, idx) => {
            const Icon = suggestion.icon
            return (
              <button
                key={idx}
                onClick={() => setInput(suggestion.text)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors whitespace-nowrap text-sm"
              >
                <Icon className="h-4 w-4" />
                {suggestion.text}
              </button>
            )
          })}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2 items-end bg-muted rounded-lg p-2">
          <button className="p-2 hover:bg-muted-foreground/10 rounded transition-colors">
            <Plus className="h-5 w-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... (Shift+Enter for new line)"
            className="flex-1 bg-transparent resize-none focus:outline-none text-sm max-h-32"
            rows={1}
          />
          <button
            className="p-2 hover:bg-muted-foreground/10 rounded transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Mic className="h-5 w-5" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={cn(
            "p-2 rounded-lg transition-colors",
            input.trim() && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 text-xs text-muted-foreground">
        <button className="hover:text-foreground transition-colors">Upload File</button>
        <span>•</span>
        <button className="hover:text-foreground transition-colors">Voice Input</button>
        <span>•</span>
        <button className="hover:text-foreground transition-colors">Clear Chat</button>
      </div>
    </div>
  )
}
