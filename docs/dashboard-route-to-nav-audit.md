# Dashboard Route-to-Nav Audit

This audit covers route destinations referenced by:

- `components/dashboard/dashboard-nav-config.ts`
- `components/dashboard/dashboard-sidebar.tsx`
- `components/dashboard/dashboard-navbar.tsx`

## Route status

| Destination | Source | Status | Notes |
| --- | --- | --- | --- |
| `/` | Sidebar brand link | ✅ Ready | Landing page exists. |
| `/dashboard` | Sidebar nav | ✅ Ready | Dashboard root with loading + error boundaries. |
| `/dashboard/streaming-studio` | Sidebar nav | ✅ Ready | Route exists. |
| `/dashboard/onboarding` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/projects/new` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/live-session` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/analytics` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/analytics/streams` | Sidebar nested item | ✅ Ready | Route exists. |
| `/seller/analytics` | Sidebar nested item | ⚠️ Coming soon | No app route exists, kept disabled. |
| `/ecommerce/analytics` | Sidebar nested item | ✅ Ready | Route exists. |
| `/upload` | Sidebar nav | ✅ Ready | Route exists. |
| `/recordings` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/alerts` | Sidebar nav | ✅ Ready | Route exists. |
| `/dashboard/account` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/settings` | Sidebar nav | ✅ Ready | Route exists. |
| `/dashboard/billing` | Sidebar nav | ✅ Ready | Route exists. |
| `/dashboard/upgrade` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/feedback` | Sidebar nav | ✅ Ready | Route exists. |
| `/agents/dashboard` | Sidebar nav | ⚠️ Coming soon | No `app/agents/dashboard/page.tsx`; rendered disabled. |
| `/automation` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/chat` | Sidebar nav + quick actions | ✅ Ready | Canonical chat workspace route. |
| `/dashboard/runash-chat` | Legacy chat entry point | ✅ Ready | Redirects to `/dashboard/chat`. |
| `/chat` | Legacy chat entry point | ✅ Ready | Redirects to `/dashboard/chat`. |
| `/runash-chat` | Legacy chat entry point | ✅ Ready | Redirects to `/dashboard/chat`. |
| `/dashboard/editor` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/dashboard/seller-studio` | Sidebar nav | ✅ Ready | Route exists. |
| `/dashboard/store` | Sidebar nav + quick actions | ✅ Ready | Route exists. |
| `/settings` | Navbar account menu | ✅ Ready | Route exists with settings loading + error boundaries. |
| `/settings/profile` | Navbar account menu | ✅ Ready | Route exists. |
| `/settings/billing` | Navbar account menu + upgrade CTA | ✅ Ready | Route exists. |
| `/stream?resume=last-live` | Navbar quick actions | ✅ Ready | Maps to `/stream`. |
| `/recordings?view=recent-edit` | Navbar quick actions | ✅ Ready | Maps to `/recordings`. |
| `/dashboard/analytics?replay=last-live` | Navbar quick actions | ✅ Ready | Maps to `/dashboard/analytics`. |

## Enforcement

- `lib/navigation/dashboard-route-audit.ts` is the source of truth used by sidebar/navbar route guards.
- A regression test ensures all required ready routes resolve to valid app pages.


## Canonical route mapping

- Product label: **Chat**
- Primary route: `/dashboard/chat`
- Legacy redirects: `/dashboard/runash-chat`, `/chat`, `/runash-chat` → `/dashboard/chat`
