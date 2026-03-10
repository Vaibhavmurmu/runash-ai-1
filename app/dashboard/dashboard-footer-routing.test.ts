import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("legacy dashboard entry points redirect to standalone app routes", () => {
  assert.match(read("app/chat/page.tsx"), /buildCanonicalRedirectPath\("\/runashchat", searchParams\)/)
  assert.match(read("app/dashboard/chat/page.tsx"), /buildCanonicalRedirectPath\("\/runashchat", searchParams\)/)
  assert.match(read("app/dashboard/runash-chat/page.tsx"), /buildCanonicalRedirectPath\("\/runashchat", searchParams\)/)
  assert.match(read("app/dashboard/editor/page.tsx"), /buildCanonicalRedirectPath\("\/editor", searchParams\)/)
})

test("dashboard destinations render through shared dashboard layout footer", () => {
  const dashboardLayout = read("app/dashboard/layout.tsx")

  assert.match(dashboardLayout, /footer=\{<DashboardFooter \/>\}/)

  const destinations = [
    "app/(workspace)/runashchat/page.tsx",
    "app/(workspace)/editor/page.tsx",
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
