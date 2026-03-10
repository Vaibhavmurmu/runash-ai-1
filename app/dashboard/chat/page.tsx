import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/dashboard/_lib/legacy-route-redirect"

interface DashboardChatLegacyPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardChatLegacyPage({ searchParams }: DashboardChatLegacyPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  permanentRedirect(buildCanonicalRedirectPath("/runashchat", resolvedSearchParams))
}
