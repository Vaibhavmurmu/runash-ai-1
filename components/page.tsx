import { Bot } from "lucide-react"

export function Logo() {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">RunAsh AI</span>
        <span className="text-xs text-muted-foreground">Agents</span>
      </div>
    </div>
  )
}
