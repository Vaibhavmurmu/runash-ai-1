import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/_lib/build-canonical-redirect-path"

type DashboardRunAshChatLegacyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function DashboardRunAshChatLegacyPage({ searchParams }: DashboardRunAshChatLegacyPageProps) {
  permanentRedirect(buildCanonicalRedirectPath("/runashchat", searchParams))
}
