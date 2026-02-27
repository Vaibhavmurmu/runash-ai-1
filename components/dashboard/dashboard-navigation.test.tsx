import assert from "node:assert/strict"
import test from "node:test"

import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { applySidebarRouteGuards } from "@/lib/navigation/sidebar-route-guards"

const knownSidebarRoutes = new Set([
  "/dashboard",
  "/dashboard/create-project",
  "/dashboard/library",
  "/dashboard/templates",
  "/dashboard/design-system",
  "/dashboard/documentation",
  "/dashboard/general",
  "/dashboard/profile",
  "/dashboard/preferences",
  "/dashboard/connections",
  "/dashboard/billing",
  "/dashboard/usage",
  "/dashboard/refer",
  "/dashboard/members",
  "/dashboard/api",
  "/agents/dashboard",
  "/automation",
  "/workflows",
  "/stream",
  "/ecommerce/dashboard",
  "/seller/dashboard",
])

test("required top-level dashboard modules remain present after route guards", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_ai_agents: false,
    },
    routeGuards: {
      "/agents/dashboard": { featureFlag: "sidebar_ai_agents", unavailableBehavior: "disable" },
    },
  })

  const labels = guardedItems.map((item) => item.label)

  assert.ok(labels.includes("Dashboard"))
  assert.ok(labels.includes("Workspace"))
  assert.ok(labels.includes("Agents"))
  assert.ok(labels.includes("Automation"))
  assert.ok(labels.includes("Workflows"))
  assert.ok(labels.includes("Team"))
  assert.ok(labels.includes("Settings"))
  assert.ok(labels.includes("Billing"))
})

test("unavailable routes are disabled with the coming soon tooltip", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_ai_agents: false,
    },
    routeGuards: {
      "/agents/dashboard": { featureFlag: "sidebar_ai_agents", unavailableBehavior: "disable" },
    },
  })

  const agents = guardedItems.find((item) => item.href === "/agents/dashboard")

  assert.ok(agents)
  assert.equal(agents.routeAvailability, "disabled")
  assert.equal(agents.tooltip, "Coming soon")
})

test("workflows nested links include only known optional routes", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
  })

  const workflows = guardedItems.find((item) => item.href === "/workflows")

  assert.ok(workflows)
  assert.deepEqual(workflows.children?.map((child) => child.href), [
    "/stream",
    "/ecommerce/dashboard",
    "/seller/dashboard",
  ])
})
