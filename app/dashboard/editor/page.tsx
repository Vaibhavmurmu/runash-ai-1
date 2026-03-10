import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/dashboard/_lib/legacy-route-redirect"

interface DashboardEditorLegacyPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function DashboardEditorLegacyPage({ searchParams }: DashboardEditorLegacyPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  permanentRedirect(buildCanonicalRedirectPath("/editor", resolvedSearchParams))
}
