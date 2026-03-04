import type { Metadata } from "next"
import Link from "next/link"
import { ActionGrid, PageHeader, SectionShell } from "@/components/dashboard/workspace/common/page-primitives"
import { Button } from "@/components/ui/button"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Workspace UI Style Guide",
  description: "Internal guidance for shared workspace page primitives and accessibility checks.",
  path: "/dashboard/documentation/workspace-ui-style-guide",
})

export default function WorkspaceUiStyleGuidePage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        eyebrow="Internal docs"
        title="Workspace UI style guide"
        description="Use shared page primitives to keep workspace pages visually consistent and accessible."
      />

      <SectionShell title="Primitive usage" description="Composable modules for workspace-level dashboard pages.">
        <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li><strong>PageHeader</strong>: Use once per page to define heading hierarchy and context badge.</li>
          <li><strong>SectionShell</strong>: Wrap each functional block in a titled section card.</li>
          <li><strong>StatusCard</strong>: Render loading, empty, error, and success states with consistent badge tones.</li>
          <li><strong>ActionGrid</strong>: Present 2-4 primary actions with equal visual priority.</li>
        </ul>
      </SectionShell>

      <SectionShell title="Accessibility checks" description="Minimum checks before shipping workspace UI updates.">
        <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li>Keyboard flow: tab order should move from page header actions to section actions with no focus traps.</li>
          <li>Labels: each actionable control requires clear, descriptive label text and optional aria-label for context.</li>
          <li>Focus order: primary actions should appear before secondary actions in DOM order.</li>
          <li>Status semantics: state labels should be visible and not rely on icon color alone.</li>
        </ul>
      </SectionShell>

      <SectionShell title="Adoption links" description="Apply these primitives across key workspace pages.">
        <ActionGrid
          items={[
            {
              title: "Templates page",
              description: "Reference implementation for state patterns and action grids.",
              href: "/dashboard/templates",
              cta: "Open templates",
            },
            {
              title: "Design system page",
              description: "Example of governance-focused content with shared primitives.",
              href: "/dashboard/design-system",
              cta: "Open design system",
            },
            {
              title: "Members page",
              description: "Membership workflows with reusable state and action cards.",
              href: "/dashboard/members",
              cta: "Open members",
            },
            {
              title: "Connections page",
              description: "Integration management route using the same structural system.",
              href: "/dashboard/connections",
              cta: "Open connections",
            },
          ]}
        />
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/dashboard/documentation">Back to documentation hub</Link>
          </Button>
        </div>
      </SectionShell>
    </div>
  )
}
