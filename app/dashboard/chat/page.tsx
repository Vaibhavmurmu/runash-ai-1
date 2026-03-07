import { createChatPageMetadata, SharedChatPageShell } from "./_shared-chat-page"

export const metadata = createChatPageMetadata("/dashboard/chat")

export default function DashboardChatPage() {
  return <SharedChatPageShell />
}
