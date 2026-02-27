import type { QuickAction } from "@/types/runash-chat"

import QuickActions from "@/components/chat/quick-actions"
import { RunAshChatFeatureGrid } from "@/components/chat/runash-chat-feature-grid"
import { RunAshChatTaskBoard } from "@/components/chat/runash-chat-task-board"

export function RunAshChatCommandCenter({
  quickActions,
  onSelectPrompt,
}: {
  quickActions: QuickAction[]
  onSelectPrompt: (prompt: string) => void
}) {
  return (
    <div className="space-y-3">
      <QuickActions actions={quickActions} />
      <RunAshChatFeatureGrid onSelect={onSelectPrompt} />
      <RunAshChatTaskBoard onRunTask={onSelectPrompt} />
    </div>
  )
}
