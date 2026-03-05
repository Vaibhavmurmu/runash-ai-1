# Next.js 16 Migration Guide - RunAsh AI

**Status:** In Progress  
**Target Version:** Next.js 16.0.0  
**From Version:** Next.js 15.5.10  
**Date Started:** 2026-03-05

## Changes Completed

### ✅ Phase 1-3: Framework Upgrade
- [x] Updated package.json: `next: 15.5.10` → `next: 16.0.0`
- [x] Updated next.config.mjs for Turbopack defaults and image optimization
- [x] Created proxy.ts (renamed from middleware.ts)
- [x] Fixed missing `auth` import in proxy.ts
- [x] Updated security headers and rate limiting configuration
- [x] Added TypeScript strictness flags (currently disabled for gradual migration)

### Key Fixes Applied

#### 1. Middleware → Proxy.ts Migration
**What Changed:**
- `middleware.ts` → `proxy.ts` 
- Export: `export async function middleware()` → `export async function proxy()`
- Added missing import: `import { auth } from "@/lib/auth"`

**Before:**
```ts
async function hasValidAuthSession(request: NextRequest): Promise<boolean> {
  try {
    const sessionPayload = await auth.api.getSession({  // ❌ auth not imported
      headers: request.headers,
    })
```

**After:**
```ts
import { auth } from "@/lib/auth"  // ✅ Added import

async function hasValidAuthSession(request: NextRequest): Promise<boolean> {
  try {
    const sessionPayload = await auth.api.getSession({  // ✅ Now works
      headers: request.headers,
    })
```

#### 2. next.config.mjs Updates
**Turbopack:** Now default in v16 (Webpack removed as default)
**Image Optimization:** Updated minimumCacheTTL (60s → 4h), removed size 16, simplified qualities

```ts
images: {
  minimumCacheTTL: 14400,  // 4 hours (new default)
  imageSizes: [32, 48, 64, 96, 128, 256, 384],  // Removed 16
  qualities: [75],  // Simplified
  dangerouslyAllowLocalIP: false,
  maximumRedirects: 3,
}
```

---

## Remaining Work

### Phase 3.1: Async Params Migration (HIGH PRIORITY)
**Affected Files:** ~150+ page/layout components  
**Pattern Change:**
```tsx
// Before
export default function Page({ params }) { }

// After (Next.js 16)
export default async function Page(props) {
  const params = await props.params
}
```

**Action Items:**
1. [ ] Update all page.tsx files with async params
2. [ ] Update all layout.tsx files with async params
3. [ ] Update all components receiving params/searchParams
4. [ ] Run type generation: `npx next typegen`

**Files to Update:**
- app/dashboard/** (15+ files)
- app/ecommerce/** (8+ files)  
- app/admin/** (5+ files)
- app/payment/** (10+ files)
- All dynamic routes: `[id]/page.tsx`

### Phase 3.2: Async Dynamic APIs
**Affected Files:** ~25 API routes and server components

```ts
// Before
import { cookies, headers, draftMode } from 'next/server'
const cookieStore = cookies()

// After (Next.js 16)
const cookieStore = await cookies()
const headerValue = (await headers()).get('x-custom')
const draft = (await draftMode()).isEnabled
```

**Files to Update:**
- app/api/auth/** 
- app/api/admin/**
- All routes using headers(), cookies(), draftMode()

### Phase 3.3: Cache API Updates
**Pattern Change:**
```ts
// Before - Deprecated
import { revalidateTag } from 'next/cache'
revalidateTag('blog-posts')

// After - v16 pattern
import { revalidateTag } from 'next/cache'
revalidateTag('blog-posts', 'max')  // For long-lived cache
```

### Phase 4: Bug Fixes

#### 4.1 Chat Backend Integration
**Issue:** app/chat/page.tsx uses simulated responses instead of real API

**Current:**
```tsx
const response = await new Promise<string>((resolve) => {
  setTimeout(() => resolve(generateSimulatedResponse(userMessage)), 1000)
})
```

**Required:**
- Create app/api/chat/v1/route.ts with proper LLM integration
- Update chat page to use fetch instead of simulation
- Add proper error handling and streaming support

**Timeline:** Phase 4

#### 4.2 TypeScript Strictness
**Current Setting:** `ignoreBuildErrors: true`  
**Target:** `ignoreBuildErrors: false`

**Action:**
1. [ ] Fix all TypeScript errors identified by strict mode
2. [ ] Enable strict type checking
3. [ ] Validate Image component prop types

**Timeline:** Phase 5

---

## Testing Checklist

### Pre-Deployment Testing
- [ ] `pnpm run type-check` - No TypeScript errors
- [ ] `pnpm run lint` - No linting issues
- [ ] `pnpm run build` - Successful build with Turbopack
- [ ] `pnpm run test` - All 77 tests passing
- [ ] Verify build time improvements (expect 2-5x faster)

### Runtime Validation
- [ ] Auth flow works (login/logout)
- [ ] API endpoints accessible
- [ ] Chat page loads and functions
- [ ] Images render with correct quality
- [ ] Security headers present in responses
- [ ] Rate limiting active

### Production Readiness
- [ ] All environment variables set
- [ ] CSP headers validated
- [ ] Database connection pooling configured
- [ ] Error monitoring integrated
- [ ] Performance metrics baseline established

---

## Breaking Changes Summary

| Breaking Change | Impact | Mitigation |
|---|---|---|
| middleware.ts → proxy.ts | File rename required | ✅ Completed |
| Async params/searchParams | ~150 files need update | 📋 Upcoming |
| Async cookies/headers/draftMode | ~25 files need update | 📋 Upcoming |
| Image minimumCacheTTL | Cache behavior changed | ✅ Configured |
| Turbopack default | Build tool changed | ✅ Ready |
| TypeScript strictness | Build may fail | 📋 Gradual rollout |

---

## Environment Variables

Ensure the following are set in Vercel project settings:

**Authentication:**
```
BETTER_AUTH_SECRET=<random-32-char>
BETTER_AUTH_URL=https://runash.in
```

**Database:**
```
DATABASE_URL=postgres://...neon...
NEON_API_KEY=...
```

**Integrations:**
```
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk_...
RESEND_API_KEY=re_...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Rollback Plan

If critical issues arise:
1. Revert to Next.js 15.5.10 in package.json
2. Restore middleware.ts from git history
3. Delete proxy.ts
4. Run `pnpm install --frozen-lockfile`
5. Deploy rollback build

**Rollback Window:** 24 hours post-deployment

---

## Performance Expectations

**Build Times:** 2-5x faster with Turbopack
- Webpack (v15): ~45-60 seconds
- Turbopack (v16): ~10-15 seconds (estimated)

**Runtime Performance:** No changes expected
**Image Optimization:** Improved with 4h cache default

---

## Resources

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Breaking Changes](https://nextjs.org/docs/app/guides/upgrading/version-16#breaking-changes)
- [Turbopack Documentation](https://turbopack.org)

---

## Progress Tracking

**Week 1 (Target):**
- ✅ Phase 1-3: Framework upgrade complete
- 📋 Phase 4: Bug fixes in progress
- 📋 Phase 5: Production optimization

**Week 2 (Target):**
- 📋 Phase 6: Comprehensive testing
- 📋 Phase 7: Deployment to production
