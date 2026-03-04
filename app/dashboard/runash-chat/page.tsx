import { permanentRedirect } from "next/navigation"

export default function DashboardRunAshChatLegacyPage() {
  permanentRedirect("/dashboard/chat")
}
