import { permanentRedirect } from "next/navigation"

export default function ChatLegacyPage() {
  permanentRedirect("/dashboard/chat")
}
