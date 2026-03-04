import { permanentRedirect } from "next/navigation"

export default function RunAshChatLegacyPage() {
  permanentRedirect("/dashboard/chat")
}
