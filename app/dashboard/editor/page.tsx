import { permanentRedirect } from "next/navigation"
import { buildCanonicalRedirectPath } from "@/app/_lib/build-canonical-redirect-path"

type DashboardEditorLegacyPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function DashboardEditorLegacyPage({ searchParams }: DashboardEditorLegacyPageProps) {
  permanentRedirect(buildCanonicalRedirectPath("/editor", searchParams))
}
