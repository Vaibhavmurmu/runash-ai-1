# UI Data Loading Audit (Real Backend Endpoints)

## Components migrated from local/mock data

- `components/ai-search.tsx`
  - Removed client-injected mock arrays (`streamResults`, `recordingResults`, `categoryResults`) and local product matching.
  - Now uses `GET /api/search?query=<q>&limit=<n>` for both suggestions and full result loading.
- `components/analytics/analytics-export.tsx`
  - Uses only `GET /api/analytics` response payload.
  - Replaced fallback behavior with explicit error handling, retry, and last successful cached snapshot.
- `components/streaming/multi-host/turn-server-diagnostics.tsx`
  - Fetches short-lived TURN credentials from `GET /api/turn-credentials` before connectivity tests.
  - Test server URLs are derived from secure backend-issued TURN URLs, not hardcoded local arrays.

## Backend endpoints required

1. `GET /api/search`
   - Auth required.
   - Accepts `query` and optional `limit`.
   - Returns unified UI search result objects and optional suggestions.
2. `GET /api/analytics`
   - Auth required.
   - Existing analytics export endpoint; must continue to provide `daily` rows for export.
3. `GET /api/turn-credentials`
   - Auth required and rate-limited.
   - Must return short-lived TURN credentials (`iceServers`, `ttl`, expiration metadata).

## Production safety controls

- `lib/data/store.ts` demo seed data is now gated behind explicit dev-only flag:
  - `NODE_ENV !== "production"`
  - `RUNASH_ENABLE_DEMO_SEED_STORE === "true"`
- Production import paths no longer statically depend on demo seed store in `services/relay-commerce-adapters.ts`.
