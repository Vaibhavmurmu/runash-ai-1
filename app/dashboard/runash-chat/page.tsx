import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/dashboard/_lib/legacy-route-redirect"

interface DashboardRunAshChatLegacyPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardRunAshChatLegacyPage({ searchParams }: DashboardRunAshChatLegacyPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  permanentRedirect(buildCanonicalRedirectPath("/runashchat", resolvedSearchParams))
}
