import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("legacy dashboard entry points redirect to standalone app routes and preserve query strings", () => {
  const redirectUtility = read("app/dashboard/_lib/legacy-route-redirect.ts")
  assert.match(redirectUtility, /export function buildCanonicalRedirectPath/)

  const dashboardEditorPage = read("app/dashboard/editor/page.tsx")
  assert.match(dashboardEditorPage, /buildCanonicalRedirectPath\("\/editor"/)

  const dashboardChatPage = read("app/dashboard/chat/page.tsx")
  assert.match(dashboardChatPage, /buildCanonicalRedirectPath\("\/runashchat"/)

  const dashboardRunAshChatPage = read("app/dashboard/runash-chat/page.tsx")
  assert.match(dashboardRunAshChatPage, /buildCanonicalRedirectPath\("\/runashchat"/)

  const chatPage = read("app/chat/page.tsx")
  assert.match(chatPage, /buildCanonicalRedirectPath\("\/runashchat"/)
})

test("canonical redirect helper maps known legacy routes with query strings", async () => {
  const { buildCanonicalRedirectPath } = await import("./_lib/legacy-route-redirect.ts")

  assert.equal(
    buildCanonicalRedirectPath("/editor", { projectId: "project-123" }),
    "/editor?projectId=project-123",
  )
  assert.equal(
    buildCanonicalRedirectPath("/runashchat", { sessionId: "session-456" }),
    "/runashchat?sessionId=session-456",
  )
})

test("major entry points route users through canonical editor and chat paths", () => {
  const createProjectWizardSource = read("components/dashboard/projects/create-project-wizard.tsx")
  assert.match(createProjectWizardSource, /router\.push\(`\/editor\?projectId=/)

  const libraryPageSource = read("components/dashboard/library/dashboard-library-page.tsx")
  assert.match(libraryPageSource, /router\.push\(`\/editor\?libraryItemId=/)

  const chatSidebarSource = read("components/chat/chat-sidebar.tsx")
  assert.match(chatSidebarSource, /openWorkspaceTool\("\/editor"\)/)
  assert.doesNotMatch(chatSidebarSource, /openWorkspaceTool\("\/(?:dashboard\/)?chat"\)/)
})

test("dashboard destinations render through shared dashboard layout footer", () => {
  const dashboardLayout = read("app/dashboard/layout.tsx")

  assert.match(dashboardLayout, /footer=\{<DashboardFooter \/>\}/)

  const destinations = [
    "app/runashchat/page.tsx",
    "app/editor/page.tsx",
    "app/dashboard/runash-chat/page.tsx",
    "app/dashboard/accounting/clients/page.tsx",
    "app/dashboard/live-session/page.tsx",
  ]

  for (const routeFile of destinations) {
    const pageSource = read(routeFile)
    assert.doesNotMatch(pageSource, /export default function .*Layout\(/, `${routeFile} should not declare its own layout`)
  }
})

test("dashboard footer keeps branded logo as the default logo renderer", () => {
  const footerSource = read("components/dashboard/dashboard-shell-footer.tsx")

  assert.match(footerSource, /type DashboardFooterProps = \{\s*logo\?: ReactNode\s*\}/s)
  assert.match(footerSource, /logo \?\? \(\s*<FooterBrand/s)
  assert.match(footerSource, /labelClassName="text-xs font-semibold uppercase tracking-\[0\.08em\] text-foreground"/)
})
