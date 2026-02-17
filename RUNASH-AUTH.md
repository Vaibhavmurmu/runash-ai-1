# Custom RunAsh Auth Integration 
Better Auth & Drizzle ORM Auth Integration Setup Guide

Complete implementation guide for migrating to Better Auth with Drizzle ORM and feature flags for gradual rollout.

## Quick Start

### 1. Install Dependencies

\`\`\`install

npm install better-auth drizzle-orm @better-auth/drizzle
npm install -D drizzle-kit @neondatabase/serverless
npm install bcryptjs
npm install -D @types/bcryptjs

\`\`\`

### 2. Environment Variables

Make sure these are set in your `.env.local` or Vercel environment:

\`\`\`env
# Better Auth
BETTER_AUTH_URL=http://localhost:3000  # or your production URL
BETTER_AUTH_SECRET=<generate-with-openssl-rand-hex-32>

# Database
DATABASE_URL=postgresql://...  # Your Neon PostgreSQL connection

# OAuth Providers (already configured in your project)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

# For file uploads/migrations
MIGRATION_SECRET=<generate-a-secret-token>
\`\`\`

To generate `BETTER_AUTH_SECRET`:

\`\`\`bash
openssl rand -hex 32
\`\`\`

### 3. Generate Database Migrations

\`\`\`bash
# Generate initial migration from schema
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate
\`\`\`

### 4. Initialize Feature Flags

\`\`\`bash
# Run the initialization script
npx ts-node scripts/init-db.ts
\`\`\`

This creates the initial feature flags in your database:
- `use_better_auth`: Controls rollout of Better Auth (0% → 100%)
- `enable_oauth`: Controls OAuth provider availability

### 5. Deploy to Vercel

\`\`\`bash
# Push changes to GitHub
git add .
git commit -m "Phase 1: Better Auth & Drizzle setup"
git push

# Deploy to Vercel (automatic or via CLI)
vercel deploy
\`\`\`

### 6. Run Database Migrations in Production

\`\`\`bash
curl -X POST https://your-app.vercel.app/api/db/migrate \
  -H "Authorization: Bearer your-migration-secret"
\`\`\`

## File Structure

Repository audit status (checked against the current tree):

| Path from plan | Status | Notes |
| --- | --- | --- |
| `app/api/auth/route.ts` | Planned | Better Auth catch-all route is not implemented in-repo. |
| `app/api/auth/session/route.ts` | Planned | Session endpoint is currently served by NextAuth/session helpers. |
| `app/api/auth/verify-email/route.ts` | Implemented | Present and active. |
| `app/api/auth/refresh-session/route.ts` | Planned | No dedicated route exists yet. |
| `app/api/auth/signout/route.ts` | Planned | Sign-out handled through existing NextAuth/client flow. |
| `app/api/auth/request-password-reset/route.ts` | Planned | Existing route is `app/api/auth/forgot-password/route.ts`. |
| `app/api/auth/reset-password/route.ts` | Implemented | Present and active. |
| `app/api/admin/flags/route.ts` | Planned | Feature-flag admin API route is documented target, not implemented yet. |
| `app/api/db/migrate/route.ts` | Planned | Migration endpoint not present. |
| `app/dashboard/page.tsx` | Implemented | Present. |
| `app/profile/page.tsx` | Planned | Dynamic API profile routes exist; page route at this path does not. |
| `app/login/page.tsx` | Implemented | Present. |
| `app/signup/page.tsx` | Planned | Registration currently uses API route + alternate UI flow. |
| `app/forgot-password/page.tsx` | Implemented | Present. |
| `app/reset-password/page.tsx` | Implemented | Present. |
| `app/verify-email/page.tsx` | Implemented | Present. |
| `db/schema.ts` | Planned | Drizzle schema file at this path is not in repository. |
| `db/migrations/` | Planned | Drizzle migration directory at this path is not in repository. |
| `lib/auth.ts` | Implemented | Present. |
| `lib/auth-client.ts` | Planned | No client wrapper at this path. |
| `lib/auth-helpers.ts` | Implemented | Present. |
| `lib/db.ts` | Implemented | Present. |
| `lib/feature-flags.ts` | Implemented | Present. |
| `lib/migration-helpers.ts` | Planned | Not implemented at this path. |
| `hooks/use-auth.ts` | Planned | Hook does not exist at this path. |
| `components/auth-provider.tsx` | Planned | Provider component does not exist at this path. |
| `scripts/init-db.ts` | Planned | Initialization script does not exist at this path. |
| `drizzle.config.ts` | Planned | Drizzle config file not present. |
| `middleware.ts` | Implemented | Present. |

## Endpoint Audit (Documented vs Current)

| Endpoint documented in this guide | Current status | Current equivalent |
| --- | --- | --- |
| `POST /api/auth/sign-up` | Planned | `POST /api/auth/register` |
| `POST /api/auth/sign-in/email` | Planned | NextAuth sign-in flow via `/api/auth/[...nextauth]` |
| `GET /api/auth/session` | Planned | NextAuth session API (`/api/auth/[...nextauth]`) |
| `POST /api/db/migrate` | Planned | No public migration route currently exposed |
| `GET /admin/flags` | Planned | No admin feature-flag page/route currently exposed |

## Current Status

### Implemented migration phases

- **Phase 0 – Harden existing auth stack (implemented):** NextAuth-based auth routes, verification/reset endpoints, middleware protection, and security hardening are active.
- **Phase 1 – OAuth account-linking hardening (implemented):** provider-linking checks and step-up hooks in `lib/auth.ts` are active.

### Planned migration phases

- **Phase 2 – Better Auth + Drizzle bootstrap (planned):** add `drizzle.config.ts`, `db/schema.ts`, and migration artifacts.
- **Phase 3 – Better Auth route surface (planned):** add Better Auth handler/session/refresh/signout/reset route structure, then migrate clients.
- **Phase 4 – Feature flag administration (planned):** add `app/api/admin/flags/route.ts` and corresponding admin UI.
- **Phase 5 – Controlled rollout and deprecation (planned):** progressive rollout from legacy NextAuth to Better Auth with rollback gates.

## Governance Cross-Links (Auth + Payment)

- Security policy linkage: `SECURITY.md` tracks mandatory auth/payment controls and log-redaction requirements.
- Payment governance linkage: `RunAsh_AI_Pay.md` and `RUNASH_PAY_BUSINESS_IMPLEMENTATION.md` now reference this auth migration status so payment/business rollouts can account for auth readiness.

## Key Features Implemented

## OAuth account-linking policy (2026-02)

RunAsh now enforces a stricter OAuth account-linking baseline in `lib/auth.ts`.

### Policy requirements

1. **Dangerous automatic linking is disabled** for configured OAuth providers (`allowDangerousEmailAccountLinking: false`).
2. **Verified email is required** before a provider account can be linked to an existing RunAsh user.
3. **Provider subject ownership is enforced**:
   - A provider `subject` (`accountId`) can only be linked to one RunAsh user.
   - If a provider subject is already linked to another user, the new link attempt is denied.
4. **Provider/issuer consistency** is enforced by requiring a stable provider identifier (`providerId`) and subject pair (`providerId + accountId`) for linking decisions.
5. **Optional step-up verification for risky links**:
   - Set `AUTH_ACCOUNT_LINK_STEP_UP_REQUIRED=true` to require step-up for all link attempts.
   - Or set `AUTH_RISKY_ACCOUNT_LINK_PROVIDERS=<csv>` to require step-up only for targeted providers.
   - Step-up is validated via `x-runash-link-step-up: verified`.
6. **Audit logging** captures account-link attempts, denials, and allows without storing OAuth tokens or raw account identifiers.

### Migration impact

- Existing linked accounts remain valid.
- New links can now be denied when:
  - the RunAsh user email is unverified,
  - the provider subject already belongs to a different user,
  - required step-up verification is missing.
- Integrations that trigger link flows should add step-up verification headers when strict mode is enabled.

### Authentication Methods
- Email + Password (with 8-char minimum)
- Google OAuth
- GitHub OAuth
- Email verification required
- Password reset flow

### Database Schema
- `users`: Core user data with migration tracking
- `sessions`: User sessions with IP/User-Agent tracking
- `accounts`: Linked OAuth accounts
- `verification_tokens`: Email verification & password reset tokens
- `auth_feature_flags`: Feature flag configuration

### Middleware session verification hardening (2026-02)

- Protected route checks in `middleware.ts` now validate Better Auth sessions via the Better Auth session endpoint (`/api/auth/get-session`) instead of trusting cookie presence alone; this keeps middleware Edge-runtime safe.
- Forged `better-auth.session-token` cookies no longer bypass middleware authentication gates for protected pages and APIs.
- On session read failures, middleware safely treats requests as unauthenticated and preserves existing redirect/401 behavior.

### Security Features
- HTTPS-only in production
- HTTPOnly, Secure, SameSite cookies
- CSRF protection (built-in)
- Password hashing with bcrypt
- Rate limiting on auth endpoints (implement as needed)
- Middleware for protected routes

### Feature Flags
- Gradual rollout of Better Auth
- Support for percentage-based rollout
- Target specific users
- Admin dashboard to manage flags

## Gradual Migration Strategy

### Test (0% Rollout)
\`\`\`javascript
// Initial flag state
use_better_auth: isEnabled=true, rolloutPercentage=0
\`\`\`
- All new users still use existing auth
- Internal team tests Better Auth in separate environment

### Expand (10% Rollout)
\`\`\`javascript
use_better_auth: rolloutPercentage=10
\`\`\`
- 10% of new users directed to Better Auth
- Monitor for issues
- Gather feedback

### Increase (50% Rollout)
\`\`\`javascript
use_better_auth: rolloutPercentage=50
\`\`\`
- Half of new users on Better Auth
- Verify compatibility with all features

### Complete (100% Rollout)
\`\`\`javascript
use_better_auth: rolloutPercentage=100
\`\`\`
- All new users on Better Auth
- Plan migration of existing users
- Archive NextAuth code

## Using the Feature Flag Admin Page

Navigate to `/admin/flags` (requires admin role):

1. **View All Flags**: See current state of all feature flags
2. **Update Rollout %**: Adjust percentage for gradual rollout
3. **Monitor Changes**: See timestamps of last updates
4. **Reset**: Change `rolloutPercentage` to 0 to disable if needed

## Testing

### Test Email/Password Login
\`\`\`bash
# Signup
POST /api/auth/sign-up
{
  "email": "test@example.com",
  "password": "TestPassword123"
}

# Login
POST /api/auth/sign-in/email
{
  "email": "test@example.com",
  "password": "TestPassword123"
}

# Check Session
GET /api/auth/session
\`\`\`

### Test OAuth Flow
- Click "Sign in with Google" → redirects to Google → returns with session
- Click "Sign in with GitHub" → redirects to GitHub → returns with session

### Test Protected Routes
- Try accessing `/dashboard` without login → redirects to `/login?from=/dashboard`
- Login successfully → can access dashboard
- Logout → redirected back to homepage

### Test Password Reset
\`\`\`bash
# Request reset
POST /api/auth/request-password-reset
{ "email": "test@example.com" }

# Check console for reset link (in dev mode)
# Reset password with token
POST /api/auth/reset-password
{ "token": "...", "password": "NewPassword123" }
\`\`\`

## Common Issues & Solutions

### Issue: Database Connection Fails
**Solution**: 
- Verify `DATABASE_URL` in environment variables
- Test connection: `psql $DATABASE_URL`
- Check Neon dashboard for connection limits

### Issue: OAuth Callbacks Not Working
**Solution**:
- Verify redirect URIs in Google Cloud / GitHub settings
- Check that `BETTER_AUTH_URL` matches your domain
- HTTPS required in production

### Issue: Migrations Don't Run
**Solution**:
- Run manually: `npx drizzle-kit migrate`
- Check `__drizzle_migrations__` table exists
- Verify non-pooling database connection

### Issue: Sessions Not Persisting
**Solution**:
- Verify cookies are being set: Check browser DevTools → Application → Cookies
- Check `BETTER_AUTH_SECRET` is same in all environments
- Verify middleware.ts is configured correctly

## Monitoring & Debugging

### Check Current Sessions
\`\`\`sql
SELECT * FROM sessions WHERE created_at > NOW() - INTERVAL '1 hour';
\`\`\`

### Monitor Feature Flag Rollout
\`\`\`sql
SELECT * FROM auth_feature_flags WHERE flag_name = 'use_better_auth';
\`\`\`

### View Verification Tokens
\`\`\`sql
SELECT * FROM verification_tokens WHERE used = false AND expires_at > NOW();
\`\`\`

### Clear Expired Sessions
\`\`\`sql
DELETE FROM sessions WHERE expires_at < NOW();
\`\`\`

## Next Steps

Once Phase 1 is stable (24+ hours without issues):

1. **Phase 2**: Setup Drizzle ORM for entire application
2. **Phase 3**: Implement Workflow automation (emails)
3. **Phase 4**: Add real-time Chat SDK
4. **Phase 5**: Expand Feature Flags system
5. **Phase 6**: Add Streaming for performance

## Support & References

- Better Auth Docs: https://better-auth.js.org
- Drizzle ORM: https://orm.drizzle.team
- Neon Docs: https://neon.tech/docs
- Next.js 16 App Router: https://nextjs.org/docs/app

## Key Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `BETTER_AUTH_URL` | Base URL for auth | `https://myapp.com` |
| `BETTER_AUTH_SECRET` | Signing secret | `abc123...` |
| `DATABASE_URL` | PostgreSQL connection | `postgres://...` |
| `GOOGLE_CLIENT_ID` | Google OAuth | `client.id@...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `abc123...` |
| `GITHUB_CLIENT_ID` | GitHub OAuth | `abc123...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | `abc123...` |
| `MIGRATION_SECRET` | Admin-only operations | `migration_token_xyz` |

 
## API Contract Note: Envelope + `/api/v1`

Auth endpoints now support a standardized API envelope for stable external consumption:
- `success`
- `data`
- `error`
- `requestId`
- optional `meta`

New integrations should prefer `/api/v1/auth/*` routes where available. Existing `/api/auth/*` routes remain active for backward compatibility and continue to expose legacy fields during migration windows.

For safe client migration:
1. Prioritize `error.code` and `error.message`.
2. Use `requestId` for auth incident traceability.
3. Read canonical payload from `data` and retain legacy fallback parsing until migration completion.

## Agent Chat API Security Guardrails

The versioned backend route `POST /api/v1/agents/chat` enforces authentication for every chat turn before model execution starts.

### Per-turn controls
- Require an authenticated session (`getServerSession`) and return `401` when missing.
- Apply per-user/IP rate limits to chat turns (`30` requests per minute window).
- Validate requested tools against an allow-list and deny unknown tool names.
- Enforce permission checks for requested tools using RBAC before streaming any response tokens.
- Return and propagate `x-correlation-id` so client and server logs can be matched safely.

### Logging policy
- Log turn lifecycle events as structured records: `turn_started`, `turn_completed`, `turn_failed`, and policy rejections.
- Never log chat message content, auth credentials, or sensitive data; only metadata (counts, IDs, timing, policy outcomes).


## Agent API authentication enforcement

All `/api/agents/*` routes require an authenticated NextAuth session. Unauthenticated requests return `401`.

Agent feedback, actions, and session history APIs are scoped to the authenticated user context to avoid cross-tenant access.

 
## Settings security confirmations

Settings UI now requires explicit confirmation dialogs for high-risk account-security actions before mutation execution (revoke sessions, regenerate/delete API keys, disable 2FA, delete account). Dialogs show in-flight progress and inline failures so users can verify intent before irreversible auth-impacting changes.


## Settings Security Mutation Safeguards (2026 update)

The settings surface now enforces additional guardrails for account security mutations:

- API key rotation returns a full key only once, at creation time; subsequent settings reads expose only a masked value and rotation timestamp.
- API key deletion, key rotation, session revocation, and 2FA disable mutations require explicit `confirm: true` intent payloads.
- Security settings PATCH requests accept minimal security payloads and reject invalid security mutation bodies.
- Sensitive security form state (for example, new password values) is cleared client-side after both success and failure paths.
- 2FA disable actions are applied both in settings state and in auth 2FA persistence.

Cross-reference: `SECURITY.md`, `docs/DOC_GOVERNANCE.md`.

## Billing and payment route authentication standardization

Billing and payment server routes now use a canonical NextAuth server-session identity layer (`lib/auth/session.ts`) instead of header placeholders.

### Enforcement rules
- All interactive billing/payment API routes require an authenticated server session.
- Request authorization is scoped to the authenticated user and (when present) their SSO organization claim.
- Legacy placeholder identity headers (for example `x-user-id`) are not used in billing usage routes.
- Mock auth services are isolated from production by disabling `mockAuth` export usage in production runtime.

### Role scope policy
- Startup-operator scope endpoints (usage tracking, payment intent create/confirm) require startup/admin-compatible roles.
- Business-operator scope endpoints (subscription mutations, billing portal, analytics) require business/admin-compatible roles.
- Super admin and admin remain globally authorized through RBAC hierarchy checks.


## Logging and traceability policy (auth routes)

Auth route failures should use structured API logging via `lib/api/logging.ts` (for example, `logApiRouteError`) instead of raw `console.error` output.

Required fields for auth error events:
- `requestId`
- `route`
- `method`
- safe `details.errorCode`

Forbidden in auth logs:
- raw email addresses
- verification/magic-link tokens
- OTP values
- session tokens, cookies, or authorization headers

Traceability standard:
- Use `requestId` / `x-request-id` for support and incident timelines.
- Do not use user email or token-derived identifiers for request tracing.

## Runtime policy update
- Mock authentication service is test-only (`NODE_ENV === "test"`) and is not available in production runtime.
- Protected billing/payment APIs must derive identity from server session (NextAuth), not request headers.



## Auth logging and audit redaction policy

- Use structured route logging (`lib/api/logging.ts`) for auth APIs and admin auth analytics routes.
- Do not log raw emails, tokens, session cookies, provider payload dumps, or credential artifacts.
- Include request correlation in auth responses/logs using `x-request-id` / `x-correlation-id` and `requestId` payload fields where implemented.
- Audit/auth events should capture non-sensitive metadata only (event code, status, actor scope, requestId).



## Payment/Billing auth controls (server-side standard)

- All payment and billing API routes now resolve identity from the server session boundary (`requireScopedBillingAccess` / `requireRoleBillingAccess`) instead of request-provided user headers.
- Usage ingestion APIs no longer accept caller-supplied `customerId` overrides; billing usage ownership is derived from the authenticated session user.
- Customer payment roles are explicitly supported for payment surfaces:
  - `customer_admin`
  - `customer_operator`
  - `customer_finance`
- Customer roles are organization-scoped: access is denied when no `organizationId` is present in session claims.
- Payment-method mutation access (`switch` / `delete`) requires session-integrity validation against the latest authorized checkout session fingerprint to mitigate cross-device misuse.


## Payment RBAC action policy (finance/admin/operator)

For payment and billing routes, role checks are enforced with explicit action classes via `RBACManager.hasBillingActionAccess` and server route guards:

- `finance:read` — reporting/analytics visibility for finance and admin roles.
- `billing:admin` — administrative billing mutations (plan/subscription administration).
- `billing:operate` — operational payment actions scoped to authorized customer/operator roles.

All customer-scoped payment resources must pass an ownership check (`ensureCustomerScopedAccess`) that validates user and organization claims from the authenticated server session.

## Role normalization migration (baseline + legacy compatibility)

RunAsh RBAC now supports baseline roles for progressive normalization while preserving legacy role compatibility.

### Baseline canonical roles and effective permissions

| Baseline role | Effective permissions bundle |
| --- | --- |
| `viewer` | read-only dashboards: `content:read`, `dashboard:read`, `admin:access`, `admin:analytics` |
| `operator` | viewer bundle + operational actions: `content:write`, `streams:create`, `payments:read`, `payments:write`, `system:maintenance`, `operations:restart`, `operations:cache:clear` (no `admin:settings`) |
| `admin` | full CRUD + system-level control: operator bundle + `users:read`, `users:write`, `users:delete`, `users:ban`, `content:delete`, `content:moderate`, `admin:settings`, `streams:moderate`, `streams:analytics`, `payments:refund`, `system:logs`, `system:control` |

### Legacy compatibility mapping

Legacy roles are mapped to baseline capabilities to avoid breaking existing users during migration:

- `guest` → `viewer`
- `user`, `premium`, `moderator`, `business_operator`, `startup_operator`, `customer_operator`, `customer_finance` → `operator`
- `admin`, `business_admin`, `startup_admin`, `customer_admin`, `super_admin` → `admin`

### Admin role assignment API behavior

`PUT /api/admin/users/[userId]/role` accepts both baseline (`viewer`, `operator`, `admin`) and legacy role values.

- Requested baseline roles are normalized to legacy storage roles for backward compatibility:
  - `viewer` → persisted as `guest`
  - `operator` → persisted as `user`
  - `admin` → persisted as `admin`
- Response now includes both `requestedRole` and `storedRole` to make migration behavior explicit.

### Migration and rollback notes

- Existing users keep current role strings; permissions are resolved through compatibility mapping.
- No payment/auth API signatures changed; role checks remain backward compatible.
- Rollback: revert RBAC normalization helpers and role-assignment API acceptance list to legacy-only values. Existing rows remain valid because stored role values are still legacy-compatible.


## 2026-02 Better Auth canonical runtime migration

### What changed
- Server-side auth runtime is now canonicalized on Better Auth (`lib/auth.ts`) for session validation in middleware and API routes.
- API routes now use shared server session helper (`lib/auth/session.ts`) for uniform `userId`, `role`, and `organizationId` extraction.
- `lib/auth-helpers.ts#getSession`, middleware auth checks, and server auth helpers now delegate to a shared accessor (`lib/auth/session-accessor.ts`) so session reads are centralized.
- Added a narrow regression check (`lib/auth-helpers.get-session-check.test.ts`) that verifies both the exported Better Auth instance and helper delegation shape remain intact.
- Legacy NextAuth server-session reads (`getServerSession(authOptions)`/`getToken`) were removed from API route, middleware, and helper authorization paths.

### Cookie/session key migration notes
- Legacy cookie names retained for migration fallback: `next-auth.session-token`, `__Secure-next-auth.session-token`.
- Canonical cookie name going forward: `better-auth.session-token`.
- Rollout behavior is controlled by `FEATURE_FLAG_USE_BETTER_AUTH`:
  - `true` (default): reads/writes canonical Better Auth cookie and clears legacy cookie names.
  - `false`: writes both canonical and legacy names, and session reads can fallback to legacy JWT cookies.
- During migration, validate load-balancer/proxy cookie forwarding allows `better-auth.session-token` for all protected route paths.

### Rollback plan
1. Set `FEATURE_FLAG_USE_BETTER_AUTH=false` to re-enable dual-write cookies and legacy-cookie session fallback without redeploying code.
2. If parity issues persist, revert this migration commit to restore previous middleware/helper session-read behavior.
3. Re-run auth smoke tests for login, role-protected admin routes, passkey login, and billing-protected APIs before reopening traffic.

## Admin API authorization matrix (admin guard)

All `app/api/admin/**` handlers now enforce a shared guard in `lib/auth-middleware.ts` via `requireAdminAuthorization(...)` and centralized route-policy resolution from `lib/rbac.ts#getRouteRequiredPermissions`.

**Baseline requirement on every admin API route:**
- `admin:access`

**Route-specific requirements (least privilege):**

| Route | Methods | Additional permissions |
| --- | --- | --- |
| `/api/admin/users` | `GET` | `users:read` |
| `/api/admin/users` | `POST` | `users:write` |
| `/api/admin/users/[userId]` | `GET` | `users:read` |
| `/api/admin/users/[userId]` | `PUT` | `users:write` |
| `/api/admin/users/[userId]` | `DELETE` | `users:delete` |
| `/api/admin/users/[userId]/role` | `PUT` | `users:write` |
| `/api/admin/users/[userId]/permissions` | `GET` | `users:read` |
| `/api/admin/users/[userId]/permissions` | `POST`, `DELETE` | `users:write` |
| `/api/admin/logs` | `GET` | `system:logs` |
| `/api/admin/logs/analytics` | `GET` | `system:logs`, `admin:analytics` |
| `/api/admin/logs/export` | `GET` | `system:logs` |
| `/api/admin/analytics/auth` | `GET` | `admin:analytics` |
| `/api/admin/analytics/auth/events` | `GET` | `admin:analytics` |
| `/api/admin/security/metrics` | `GET` | `admin:analytics` |
| `/api/admin/security/threats` | `GET` | `admin:analytics` |
| `/api/admin/security/threats` | `POST` | `system:maintenance` |
| `/api/admin/settings` | `GET`, `POST` | `admin:settings` |
| `/api/admin/settings/[category]` | `GET` | `admin:settings` |
| `/api/admin/performance` | `GET`, `POST` | `system:maintenance` |
| `/api/admin/sso/organizations` | `POST` | `admin:settings` |
| `/api/admin/email-analytics` | `GET` | `admin:analytics` |
| `/api/admin/email-analytics/realtime` | `GET` | `admin:analytics` |
| `/api/admin/email-delivery` | `GET` | `admin:analytics` |
| `/api/admin/email-delivery/stats` | `GET` | `admin:analytics` |
| `/api/admin/email-suppressions` | `GET` | `admin:analytics` |
| `/api/admin/email-suppressions` | `POST`, `DELETE` | `admin:settings` |
| `/api/admin/email-templates` | `GET` | `admin:analytics` |
| `/api/admin/email-templates` | `POST` | `admin:settings` |
| `/api/admin/email-templates/[id]` | `GET` | `admin:analytics` |
| `/api/admin/email-templates/[id]` | `PUT`, `DELETE` | `admin:settings` |


## Protected admin UI route matrix

Protected admin pages now use shared server guard `requireAdminUiRouteAccess(...)` (`lib/admin-route-guard.ts`) with the same centralized route-policy lookup in `lib/rbac.ts`.

| Route | Required permissions |
| --- | --- |
| `/admin` | `admin:access` |
| `/admin/performance` | `admin:access`, `admin:analytics` |
| `/admin/email-analytics` | `admin:access`, `admin:analytics` |
| `/admin/email-management` | `admin:access`, `admin:settings` |
| `/admin/users` | `admin:access`, `users:read` |

### Standardized denied responses

For failed admin authorization, the guard returns:
- `401 Unauthorized` when no valid session exists.
- `403 Forbidden` when `admin:access` or route-specific permissions are missing.

Both responses include:
- JSON body with `error` and `requestId`
- `x-request-id` and `x-correlation-id` headers
- audit events emitted via API logging (`*.unauthorized` / `*.forbidden`)
