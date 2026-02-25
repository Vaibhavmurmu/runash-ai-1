import assert from "node:assert/strict"
import test from "node:test"

import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { applySidebarRouteGuards } from "@/lib/navigation/sidebar-route-guards"

const knownSidebarRoutes = new Set([
  "/dashboard",
  "/agents/dashboard",
  "/automation",
  "/workflows",
  "/payments",
  "/dashboard/streaming-studio",
  "/dashboard/editor",
  "/dashboard/seller-studio",
])

test("required top-level dashboard modules remain present after route guards", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_ai_agents: true,
    },
    routeGuards: {
      "/agents/dashboard": { featureFlag: "sidebar_ai_agents", unavailableBehavior: "disable" },
    },
  })

  const labels = guardedItems.map((item) => item.label)

  assert.ok(labels.includes("Dashboard"))
  assert.ok(labels.includes("Agents"))
  assert.ok(labels.includes("Automation"))
  assert.ok(labels.includes("Workflows"))
  assert.ok(labels.includes("Payments"))
})

test("unavailable routes are disabled with the coming soon tooltip", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_ai_agents: true,
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
    "/dashboard/streaming-studio",
    "/dashboard/editor",
    "/dashboard/seller-studio",
  ])
})
