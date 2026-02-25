import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import {
  dashboardRouteAuditEntries,
  dashboardReadyRoutes,
  normalizeDashboardHref,
} from "@/lib/navigation/dashboard-route-audit"

const repoRoot = process.cwd()

function resolveRoutePagePath(href: string) {
  const normalized = normalizeDashboardHref(href)

  if (normalized === "/") {
    return path.join(repoRoot, "app", "page.tsx")
  }

  const routePath = normalized.slice(1)
  return path.join(repoRoot, "app", routePath, "page.tsx")
}

test("required dashboard sidebar/header routes resolve to valid app pages", () => {
  const requiredReadyRoutes = dashboardRouteAuditEntries.filter(
    (entry) => entry.required && entry.readiness === "ready",
  )

  const missingPages = requiredReadyRoutes.filter(
    (entry) => !existsSync(resolveRoutePagePath(entry.href)),
  )

  assert.deepEqual(
    missingPages,
    [],
    `Missing app page(s) for required route(s): ${missingPages.map((entry) => entry.href).join(", ")}`,
  )
})

test("coming-soon routes are excluded from ready navigation set", () => {
  const comingSoonEntries = dashboardRouteAuditEntries.filter(
    (entry) => entry.readiness === "coming-soon",
  )

  for (const entry of comingSoonEntries) {
    assert.equal(
      dashboardReadyRoutes.has(normalizeDashboardHref(entry.href)),
      false,
      `${entry.href} should not be treated as a ready route`,
    )
  }
})
