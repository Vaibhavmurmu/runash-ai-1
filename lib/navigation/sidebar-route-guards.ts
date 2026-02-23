import type { DashboardNavItem } from "@/components/dashboard/dashboard-nav-config"

export type RouteAvailability = "available" | "disabled" | "hidden"

export interface SidebarRouteGuardedItem extends DashboardNavItem {
  routeAvailability: RouteAvailability
  tooltip?: string
}

interface SidebarRouteGuard {
  featureFlag?: string
  unavailableBehavior?: "hide" | "disable"
}

interface SidebarRouteGuardOptions {
  knownRoutes: ReadonlySet<string>
  featureFlags?: Readonly<Record<string, boolean>>
  routeGuards?: Readonly<Record<string, SidebarRouteGuard>>
}

const DEFAULT_UNAVAILABLE_TOOLTIP = "Coming soon"

export function applySidebarRouteGuards(
  items: readonly DashboardNavItem[],
  options: SidebarRouteGuardOptions,
): SidebarRouteGuardedItem[] {
  const featureFlags = options.featureFlags ?? {}

  return items
    .map((item): SidebarRouteGuardedItem | null => {
      const guard = options.routeGuards?.[item.href]

      if (guard?.featureFlag && featureFlags[guard.featureFlag] === false) {
        if (guard.unavailableBehavior === "disable") {
          return {
            ...item,
            routeAvailability: "disabled",
            tooltip: DEFAULT_UNAVAILABLE_TOOLTIP,
          }
        }

        return null
      }

      if (!options.knownRoutes.has(item.href)) {
        return {
          ...item,
          routeAvailability: "disabled",
          tooltip: DEFAULT_UNAVAILABLE_TOOLTIP,
        }
      }

      return {
        ...item,
        routeAvailability: "available",
      }
    })
    .filter((item): item is SidebarRouteGuardedItem => item !== null)
}
