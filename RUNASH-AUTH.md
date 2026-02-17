# Custom RunAsh Auth Integration 


## 2026-02 Target-State Auth Architecture (Single Runtime / Single Session Source)

### Target state definition

RunAsh auth cutover target is a **single Better Auth runtime** with one canonical session validation path.

1. **Single runtime**
   - Better Auth is the only active auth runtime and signer/verifier for session artifacts.
   - `/api/auth/[...nextauth]` remains as the compatibility route surface during transition but is backed by `better-auth/next-js` + `lib/auth.ts`.
   - No dual-write or dual-validation against legacy NextAuth internals after cutover gate is opened.
2. **Single session source of truth**
   - Session validity is resolved server-side from Better Auth session APIs/readers (`/api/auth/get-session` + server accessors).
   - Middleware, API guards, and SSR checks must use the same session accessor contract and must not trust cookie presence alone.
3. **Fallback behavior (safe degradation)**
   - If session lookup fails (network/runtime error, timeout, malformed payload), treat request as unauthenticated.
   - Preserve current UX behavior: UI routes redirect to `/login`; API routes return `401`.
   - Fallback must never grant access, never mint new session state, and never log sensitive cookie/token values.
4. **Rollback path**
   - Rollback is configuration-first:
     - disable Better Auth rollout flag (`use_better_auth`) for targeted cohorts,
     - keep compatibility handlers/routes active,
     - revert auth UI client calls to legacy-safe route behavior without schema changes.
   - Rollback must preserve existing cookie names and token parsing during the rollback window so active sessions are not force-expired unintentionally.
   - If emergency rollback is required in production, execute staging-validated rollback runbook first (see cutover gates below).

### Current auth touchpoint inventory and classification

#### Core runtime/session files

| Touchpoint | Current role | Classification | Transition action |
| --- | --- | --- | --- |
| `lib/auth.ts` | Better Auth runtime config, provider setup, account-linking security hooks | **KEEP** | Keep as canonical runtime and tighten as needed; avoid API/signature breaks. |
| `lib/auth-helpers.ts` | Server session/user helper bridge + rollout helper (`shouldUseBetterAuth`) | **REPLACE (incremental)** | Keep helper names; replace internals so all reads use one session accessor path and deprecate dual-runtime branching at 100% rollout. |
| `middleware.ts` | Edge auth gate, route access control, rate limits, `/api/auth/get-session` verification | **KEEP** | Keep behavior; standardize error/fallback contract and keep fail-closed semantics. |

#### API surface (`app/api/**`) touchpoints

| Touchpoint | Current role | Classification | Transition action |
| --- | --- | --- | --- |
| `app/api/auth/[...nextauth]/route.ts` | Main auth handler route, currently Better Auth-backed | **KEEP (compat route)** | Keep during transition; optional rename only after clients are migrated and aliases exist. |
| `app/api/auth/register/route.ts` | Primary signup endpoint | **KEEP** | Keep contract stable for existing clients; internals can move to shared auth services. |
| `app/api/v1/auth/register/route.ts` | Versioned/legacy-compatible register endpoint | **KEEP (compat)** | Preserve response fields; retire only after explicit API version sunset. |
| `app/api/auth/forgot-password/route.ts` | Password reset initiation | **KEEP** | Keep endpoint and payload contract; move session invalidation + auditing into shared auth runtime services. |
| `app/api/auth/reset-password/route.ts` | Password reset completion | **KEEP** | Keep endpoint contract; enforce session revocation on success. |
| `app/api/auth/change-password/route.ts` | Authenticated password change | **KEEP** | Keep; ensure it resolves actor identity through single session accessor. |
| `app/api/auth/verify-email/route.ts` | Email verification confirmation | **KEEP** | Keep existing token/link flow for backward compatibility. |
| `app/api/auth/resend-verification/route.ts` | Verification re-send | **KEEP** | Keep; ensure rate-limit + anti-enumeration consistency. |
| `app/api/auth/magic-link/route.ts` | Magic-link request | **KEEP** | Keep endpoint shape; unify token issuance/validation under Better Auth runtime controls. |
| `app/api/auth/magic-link/verify/route.ts` | Magic-link verification | **KEEP** | Keep route; ensure cookie issuance uses canonical runtime only. |
| `app/api/auth/otp/email/route.ts` + `app/api/auth/otp/sms/route.ts` | OTP send/verify flows | **KEEP** | Keep API shape; centralize challenge/session binding logic. |
| `app/api/auth/2fa/setup/route.ts`, `app/api/auth/2fa/verify/route.ts`, `app/api/auth/2fa/backup-codes/route.ts` | 2FA provisioning and verification | **KEEP** | Keep endpoints; align all verification checks to single session source. |
| `app/api/auth/passkey/register/route.ts`, `app/api/auth/passkey/authenticate/route.ts` | Passkey registration/authentication | **KEEP** | Keep WebAuthn contract stable; only replace internals as runtime converges. |
| `app/api/auth/permissions/route.ts` | Permission introspection for authenticated user | **KEEP** | Keep route and payload; switch to one canonical auth context resolver if not already. |
| `app/api/auth/sso/check/route.ts` | SSO discovery/check helper | **KEEP** | Keep contract stable; ensure org/user resolution follows canonical runtime identity. |
| `app/api/admin/analytics/auth/route.ts` + `app/api/admin/analytics/auth/events/route.ts` | Auth analytics/audit API | **KEEP** | Keep; verify no sensitive token/cookie data is logged. |
| Non-auth API routes that depend on auth context | Protected business endpoints | **REPLACE (internal auth plumbing)** | Preserve endpoint contracts; replace ad-hoc auth reads with shared session accessor. |

#### Auth UI touchpoints

| Touchpoint | Current role | Classification | Transition action |
| --- | --- | --- | --- |
| `app/login/page.tsx` | Login UI using `next-auth/react` client helpers | **REPLACE** | Migrate to Better Auth client/session primitives while preserving UX copy and redirect behavior. |
| `app/get-started/page.tsx` | Registration/onboarding UI with OAuth and register API calls | **REPLACE** | Migrate sign-in provider calls to Better Auth client APIs; keep register API payload contract stable. |
| `app/forgot-password/page.tsx` | Forgot password request UI | **KEEP** | Keep UI and endpoint contract; only adjust handling as needed for unified errors. |
| `app/reset-password/page.tsx` | Reset password UI | **KEEP** | Keep route and token UX stable; ensure post-reset session behavior matches compatibility rules. |
| `app/verify-email/page.tsx` | Email verification UI | **KEEP** | Keep; preserve verification link compatibility for in-flight emails. |
| `app/auth/magic-link/page.tsx` | Magic link completion UI | **KEEP** | Keep route and token parsing behavior stable. |
| `app/unauthorized/page.tsx` | Unauthorized fallback page | **KEEP** | Keep as unchanged UX endpoint for authorization failures. |
| `/signup` page route (planned/legacy references) | Duplicate signup surface | **REMOVE (deferred)** | Do not reintroduce duplicate signup route; use `/get-started` as single signup experience. |

### Transition compatibility rules (users, cookies, tokens)

1. **Existing users**
   - Existing user IDs remain the durable principal key across transition.
   - No forced account recreation, no email re-verification reset, and no role/permission resets as a side effect of auth runtime cutover.
2. **Cookies**
   - Maintain read compatibility for currently issued auth cookies during the migration window.
   - Writers must converge to the Better Auth canonical cookie/session format at cutover.
   - Cookie attribute policy (HttpOnly/Secure/SameSite/TTL) may be tightened but not relaxed.
3. **Tokens (verification/reset/magic-link/2FA)**
   - Previously issued, unexpired tokens continue to validate through transition.
   - Token verifiers should support legacy token formats until token TTL + grace window has elapsed after cutover.
   - Do not log raw token values; only hashed/redacted identifiers in telemetry.
4. **Session continuity**
   - Active sessions should remain valid through normal TTL where cryptographically compatible.
   - If incompatibility is unavoidable, force re-auth only behind an explicit release gate with user-facing communication.
5. **API compatibility**
   - Preserve existing request/response field names for auth endpoints unless a versioned route is introduced.
   - Any breaking auth contract change requires migration notes and staged client rollout.

### Migration checklist with explicit cutover gates

#### Gate 1 — Development
- [ ] Target-state architecture documented and approved in `RUNASH-AUTH.md`.
- [ ] Touchpoint inventory completed (keep/replace/remove) and owners assigned.
- [ ] Local validation green: `npm run lint`, `npm run build`.
- [ ] Unit/integration checks for session accessor fail-closed behavior added or updated.
- [ ] Rollback drill executed locally (feature flag off path tested).

**Exit criterion:** all auth paths resolve identity from one canonical session accessor in development.

#### Gate 2 — Staging
- [ ] 100% of staging traffic uses Better Auth runtime.
- [ ] Cookie/token backward-compatibility checks pass for pre-cutover staging fixtures.
- [ ] Middleware/API/UI behavior parity confirmed for login, logout, reset, verify-email, magic-link, OAuth, 2FA, passkeys.
- [ ] Security review confirms no sensitive auth data in logs/analytics.
- [ ] Rollback rehearsal executed and timed (RTO documented).

**Exit criterion:** staging can run steady-state for agreed soak period with no Sev-1/Sev-2 auth regressions.

#### Gate 3 — Production
- [ ] Progressive rollout plan approved (e.g., cohort/percentage ramps with halt criteria).
- [ ] Real-time monitoring/alerts enabled for auth success rate, failure rate, session validation errors, and lockout anomalies.
- [ ] Support + incident runbook updated with rollback commands and decision tree.
- [ ] Backward-compatibility window start/end dates published.
- [ ] Final go/no-go review signed by engineering + security owners.

**Exit criterion:** production rollout reaches 100% with stable auth KPIs through the defined observation window.



## 2026-02 Security Hardening Addendum

- OAuth/provider account linking now enforces **verified identity linking** by default (`AUTH_ENFORCE_VERIFIED_IDENTITY_LINKING=true`). Linking is denied unless the primary RunAsh account is email-verified **and** step-up identity proof (`x-runash-identity-verified: verified` or `x-runash-link-step-up: verified`) is present with provider identity evidence (`idToken`).
- Session policy adds explicit controls for:
  - rotation due signal (`AUTH_SESSION_ROTATION_INTERVAL_MS`, default 30m),
  - inactivity timeout (`AUTH_SESSION_INACTIVITY_TIMEOUT_MS`, default 30m),
  - absolute timeout (`AUTH_SESSION_ABSOLUTE_TIMEOUT_MS`, default 24h).
- Sensitive changes (`change-password`, `reset-password`) now trigger best-effort server-side session invalidation.
- Auth endpoint abuse controls now use centralized per-endpoint limits in `lib/auth-security-config.ts` for middleware and route parity.
- Auth/admin observability now emits dashboard-ready in-memory counters for login success/failure, role and permission changes, session invalidation/rotation, and suspicious/rate-limited activity.

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
| `app/api/admin/flags/route.ts` | Implemented | Admin feature-flag list/upsert route is now present. |
| `app/api/db/migrate/route.ts` | Planned | Migration endpoint not present. |
| `app/dashboard/page.tsx` | Implemented | Present. |
| `app/profile/page.tsx` | Planned | Dynamic API profile routes exist; page route at this path does not. |
| `app/login/page.tsx` | Implemented | Present. |
| `app/signup/page.tsx` | Planned | Registration currently uses API route + alternate UI flow. |
| `app/forgot-password/page.tsx` | Implemented | Present. |
| `app/reset-password/page.tsx` | Implemented | Present. |
| `app/verify-email/page.tsx` | Implemented | Present. |
| `db/schema.ts` | Implemented (placeholder) | Present as rollout anchor; SQL migrations remain source-of-truth. |
| `db/migrations/` | Planned | Drizzle migration directory at this path is not in repository. |
| `lib/auth.ts` | Implemented | Present. |
| `lib/auth-client.ts` | Planned | No client wrapper at this path. |
| `lib/auth-helpers.ts` | Implemented | Present. |
| `lib/db.ts` | Implemented | Present. |
| `lib/feature-flags.ts` | Implemented | Present. |
| `lib/migration-helpers.ts` | Implemented | Helper provisions auth/admin migration tables for Neon SQL path. |
| `hooks/use-auth.ts` | Planned | Hook does not exist at this path. |
| `components/auth-provider.tsx` | Planned | Provider component does not exist at this path. |
| `scripts/init-db.ts` | Planned | Initialization script does not exist at this path. |
| `drizzle.config.ts` | Implemented (placeholder) | Present with DATABASE_URL/NEON_DATABASE_URL resolution for phased adoption. |
| `middleware.ts` | Implemented | Present. |

## Endpoint Audit (Documented vs Current)

| Endpoint documented in this guide | Current status | Current equivalent |
| --- | --- | --- |
| `POST /api/auth/sign-up` | Planned | `POST /api/auth/register` |
| `POST /api/auth/sign-in/email` | Planned | NextAuth sign-in flow via `/api/auth/[...nextauth]` |
| `GET /api/auth/session` | Planned | NextAuth session API (`/api/auth/[...nextauth]`) |
| `POST /api/db/migrate` | Planned | No public migration route currently exposed |
| `GET /api/admin/flags` | Implemented | Feature-flag admin API route with authorization and validation |

## Current Status

### Implemented migration phases

- **Phase 0 – Harden existing auth stack (implemented):** NextAuth-based auth routes, verification/reset endpoints, middleware protection, and security hardening are active.
- **Phase 1 – OAuth account-linking hardening (implemented):** provider-linking checks and step-up hooks in `lib/auth.ts` are active.

### Planned migration phases

- **Phase 2 – Better Auth + Drizzle bootstrap (in progress):** config/schema anchors added; full migration artifacts and runtime adoption remain planned.
- **Phase 3 – Better Auth route surface (planned):** add Better Auth handler/session/refresh/signout/reset route structure, then migrate clients.
- **Phase 4 – Feature flag administration (in progress):** admin API route exists; admin UI remains planned.
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

- Role validation now enforces assignment through a shared allowlist helper (`isAssignableAdminRole`) so role-management routes stay aligned as canonical roles evolve.
- Requested baseline roles are normalized to legacy storage roles for backward compatibility:
  - `viewer` → persisted as `guest`
  - `operator` → persisted as `user`
  - `admin` → persisted as `admin`
- Response now includes both `requestedRole` and `storedRole` to make migration behavior explicit.

### Admin route authorization consistency

- Route-level RBAC permission mapping now explicitly covers role/permission/session/audit/flags admin surfaces (for example `/api/admin/roles`, `/api/admin/permissions`, `/api/admin/sessions`, `/api/admin/audit-logs`).
- Protected admin UI routes continue to enforce `admin:access`, with additional route-specific checks such as `/admin/roles` requiring `admin:settings`.

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
- Canonical cookie names going forward: `better-auth.session-token` and `__Secure-better-auth.session-token`.
- Middleware protected-route checks now only attempt server-side session validation when a Better Auth cookie is present, then validate through `/api/auth/get-session`.
- Rollout behavior is controlled by `FEATURE_FLAG_USE_BETTER_AUTH`:
  - `true` (default): reads/writes canonical Better Auth cookie names and clears legacy NextAuth cookie names.
  - `false`: writes both canonical and legacy names, and shared server session accessors can fallback to legacy JWT cookies.
- During migration, validate load-balancer/proxy cookie forwarding allows Better Auth cookie names for all protected route paths.

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

Audit result for `app/api/admin/**/route.ts`:
- All current admin API handlers use `requireAdminAuthorization(...)` with explicit route permissions.
- No handlers were found that only check authentication without role/permission validation.

For failed admin authorization, the guard returns:
- `401 Unauthorized` when no valid session exists.
- `403 Forbidden` when `admin:access` or route-specific permissions are missing.

Both responses include:
- JSON body with a consistent shape: `{ success: false, error: { code, message }, requestId }`
- `x-request-id` and `x-correlation-id` headers
- audit events emitted via API logging (`*.unauthorized` / `*.forbidden`)

For successful admin authorization, the guard also emits `*.allowed` audit events with request metadata (route, method, requestId, and userId) without request-body payloads.

## Implemented vs Planned (2026-02 refresh)

### Implemented
- `app/api/admin/flags/route.ts` now exists for admin feature-flag listing/upsert with schema validation and admin authorization.
- `lib/migration-helpers.ts` now exists and can provision admin auth support tables (`admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_audit_logs`, `feature_flags`) in Neon.
- Admin management CRUD route surface now includes:
  - `app/api/admin/roles` and `app/api/admin/roles/:id`
  - `app/api/admin/permissions` and `app/api/admin/permissions/:id`
  - `app/api/admin/sessions` and `app/api/admin/sessions/:id`
  - `app/api/admin/audit-logs` and `app/api/admin/audit-logs/:id`

### Planned
- Better Auth catch-all and session route replacement (`/api/auth/route.ts`, dedicated refresh route) remain planned.
- Drizzle-first migration artifacts (`db/schema.ts`, `db/migrations/`, `drizzle.config.ts`) remain planned and are not required for current Neon SQL execution paths.

## DATABASE_URL and Neon path consistency

RunAsh auth and admin APIs now follow this resolution order for server-side SQL connection strings:
1. `DATABASE_URL` (primary)
2. `NEON_DATABASE_URL`
3. `POSTGRES_URL`
4. `POSTGRES_PRISMA_URL`
5. `POSTGRES_URL_NON_POOLING`
6. `runash_POSTGRES_URL`
7. `runash_POSTGRES_URL_NON_POOLING`

Deployment recommendation:
- Always set `DATABASE_URL` to the canonical Neon connection string.
- Use fallback variables only for compatibility while migrating older deployments.

## 2026-02 phased auth rollout + KPI guardrails

### Feature-flag rollout phases (`use_better_auth`)
1. **Internal**: enable for RunAsh staff and staging org IDs only.
2. **10% cohort**: enable for deterministic 10% user hash bucket while monitoring auth/session errors.
3. **50% cohort**: expand to 50% once KPI thresholds hold for 24 hours.
4. **100%**: full rollout after two consecutive healthy windows.

### Rollback criteria
- Auth error rate increases above **2x baseline** for 15 minutes.
- Session invalidation rate exceeds **3%** of active sessions in a 30-minute window.
- Admin 403 anomaly rate (unexpected denies on known-admin accounts) exceeds **1%** of admin API calls.
- Any Sev1 payment/auth incident triggered by auth migration.

Rollback action: set `FEATURE_FLAG_USE_BETTER_AUTH=false` to return to legacy fallback path, then run targeted smoke checks for sign-in, sign-out, session refresh, and admin routes before re-expanding traffic.

### Migration KPI dashboard requirements
Track and alert on:
- `auth_error_rate` (login/session/api-auth failures per minute)
- `session_invalidation_rate` (invalidated sessions / active sessions)
- `admin_403_anomaly_rate` (unexpected forbidden responses for known-admin principals)
- `payment_auth_incident_count` (open + newly created incidents tied to auth/payment interactions)

## 2026-02 Auth Runtime Consolidation Update

- `lib/auth.ts` is the canonical Better Auth server module and exports the production `auth` instance used by API handlers.
- Added explicit auth route handlers for:
  - `POST /api/auth/sign-in`
  - `POST /api/auth/sign-out`
  - `GET /api/auth/session`
  - `GET|POST /api/auth/verify-email`
  - `POST /api/auth/reset-password`
- Server-side session reads are standardized through `getServerAuthSession` to reduce fragmented access patterns.
- Auth persistence now consistently uses shared Neon/PostgreSQL access utilities (`@/lib/db`) instead of ad-hoc client initialization in auth modules/routes.

## 2026-02 Admin Authorization Hardening (Route-level + CRUD)

- Admin API route-policy resolution now enforces method-aware permissions for admin CRUD endpoints:
  - **Read:** `users:read`, `system:logs`, `admin:analytics`
  - **Operate:** `users:write`, `system:maintenance`
  - **Settings-write:** `admin:settings`
  - **Destructive (elevated):** `system:control` in addition to route-specific permissions
- CRUD coverage is now complete for admin-managed resources:
  - `users`: list/create/read/update/delete
  - `roles`: list/create/read/update/delete
  - `permissions`: list/create/read/update/delete
  - `sessions`: list/create/read/update/delete
  - `audit records`: list/create/read/update/delete
- Destructive operations (`DELETE`) now require elevated permission checks and emit admin audit log entries.
- Error envelope handling for auth-critical admin APIs is standardized for `401`, `403`, and `500` responses through shared helpers with request correlation headers.

## Auth security observability updates (current)

- Added structured security audit events for login attempts/results, session create/revoke/invalidate operations, role/permission mutations, and generic admin operations.
- Added security dashboard data source endpoints for operations:
  - `GET /api/admin/analytics/auth` now includes `securityDashboard` rollups.
  - `GET /api/admin/analytics/security` provides focused auth failure/suspicious/admin operation telemetry.
- Enforced stricter auth/payment log hygiene by redacting token/secret/session/credential-like fields before metric and audit persistence.

### Operations checklist
1. Use `securityDashboard.totals.authFailures` for brute-force monitoring.
2. Use `securityDashboard.totals.suspiciousActivity` for anomaly triage.
3. Use `securityDashboard.totals.adminOperations` and `admin_audit_logs` for privileged operation reviews.
