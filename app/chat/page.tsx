import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/dashboard/_lib/legacy-route-redirect"

interface ChatLegacyPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ChatLegacyPage({ searchParams }: ChatLegacyPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  permanentRedirect(buildCanonicalRedirectPath("/runashchat", resolvedSearchParams))
}
