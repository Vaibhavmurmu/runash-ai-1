import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/_lib/build-canonical-redirect-path"

type DashboardChatLegacyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function DashboardChatLegacyPage({ searchParams }: DashboardChatLegacyPageProps) {
  permanentRedirect(buildCanonicalRedirectPath("/runashchat", searchParams))
}
