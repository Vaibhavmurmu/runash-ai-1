import { createChatPageMetadata, SharedChatPageShell } from "../dashboard/chat/_shared-chat-page"

export const metadata = createChatPageMetadata("/dashboard/chat")

export default function RunAshChatLegacyPage() {
  return <SharedChatPageShell />
}
