import assert from "node:assert/strict"
import test from "node:test"

import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { applySidebarRouteGuards } from "@/lib/navigation/sidebar-route-guards"

const knownSidebarRoutes = new Set([
  "/dashboard",
  "/stream",
  "/schedule",
  "/analytics",
  "/analytics/streams",
  "/upload",
  "/recordings",
  "/alerts",
  "/settings",
  "/automation",
  "/runash-chat",
  "/editor",
  "/seller/dashboard",
  "/ecommerce/dashboard",
  "/ecommerce/analytics",
])

test("required dashboard sidebar items remain present after route guards", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_ai_agents: true,
      sidebar_store: true,
    },
    routeGuards: {
      "/agents/dashboard": { featureFlag: "sidebar_ai_agents", unavailableBehavior: "disable" },
      "/ecommerce/dashboard": { featureFlag: "sidebar_store", unavailableBehavior: "hide" },
    },
  })

  const labels = guardedItems.map((item) => item.label)

  assert.ok(labels.includes("Dashboard"))
  assert.ok(labels.includes("Go Live"))
  assert.ok(labels.includes("Settings"))
  assert.ok(labels.includes("Store"))
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

  const aiAgents = guardedItems.find((item) => item.href === "/agents/dashboard")

  assert.ok(aiAgents)
  assert.equal(aiAgents.routeAvailability, "disabled")
  assert.equal(aiAgents.tooltip, "Coming soon")
})

test("feature-flagged routes are hidden when disabled", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
    featureFlags: {
      sidebar_store: false,
    },
    routeGuards: {
      "/ecommerce/dashboard": { featureFlag: "sidebar_store", unavailableBehavior: "hide" },
    },
  })

  assert.equal(
    guardedItems.some((item) => item.href === "/ecommerce/dashboard"),
    false,
  )
})


test("analytics nested links include only known optional routes", () => {
  const guardedItems = applySidebarRouteGuards(dashboardNavigationConfig.items, {
    knownRoutes: knownSidebarRoutes,
  })

  const analytics = guardedItems.find((item) => item.href === "/analytics")

  assert.ok(analytics)
  assert.deepEqual(
    analytics.children?.map((child) => child.href),
    ["/analytics/streams", "/ecommerce/analytics"],
  )
})
