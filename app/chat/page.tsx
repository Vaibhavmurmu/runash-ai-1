import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/_lib/build-canonical-redirect-path"

type ChatLegacyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function ChatLegacyPage({ searchParams }: ChatLegacyPageProps) {
  permanentRedirect(buildCanonicalRedirectPath("/runashchat", searchParams))
}
