# Testing & Validation Strategy for Next.js 16 Upgrade

**Status:** Phase 6 (Comprehensive Testing)  
**Test Framework:** Node.js test runner  
**Coverage Target:** Maintain >70% coverage  
**Completion Target:** 2026-03-12

---

## Test Execution Overview

```bash
# Run all tests
pnpm run test

# Run specific test file
pnpm run test lib/auth-helpers.get-session-check.test.ts

# Watch mode (development)
pnpm run test:watch

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Full validation suite
pnpm run type-check && pnpm run lint && pnpm run build && pnpm run test
```

---

## Current Test Coverage (77 test files)

### Authentication Tests
- Session validation flows
- OAuth provider integration
- Magic link authentication
- Email verification
- Token refresh logic
- Rate limiting on auth endpoints

### API Route Tests
- Chat API validation and streaming
- Payment webhook processing
- Billing calculations
- Admin operations
- Rate limiting enforcement

### Component Tests
- Chat workspace interactions
- Dashboard rendering
- Form submissions
- Payment flows

### Utility Function Tests
- Database queries
- Cache operations
- Email formatting
- Data transformations

---

## New Tests Required for Next.js 16

### 1. Async Params Migration Tests

**File:** `app/__tests__/async-params.test.ts`

```ts
import { describe, it, expect } from "node:test"

describe("Async Params Migration", () => {
  it("should handle Promise<params> pattern", async () => {
    // Test dynamic route params resolution
    const props = { params: Promise.resolve({ id: "test-123" }) }
    const params = await props.params
    expect(params.id).toBe("test-123")
  })

  it("should handle Promise<searchParams> pattern", async () => {
    // Test search params resolution
    const props = { searchParams: Promise.resolve({ query: "test" }) }
    const searchParams = await props.searchParams
    expect(searchParams.query).toBe("test")
  })

  it("should work in client components with useEffect", async () => {
    // Test client-side async param handling
    // Mock component that awaits params in useEffect
  })
})
```

### 2. Async Dynamic APIs Tests

**File:** `app/__tests__/async-apis.test.ts`

```ts
describe("Async Dynamic APIs", () => {
  it("should handle async cookies() call", async () => {
    // Test: const cookieStore = await cookies()
    // Verify: cookieStore.get('name') works
  })

  it("should handle async headers() call", async () => {
    // Test: const headerList = await headers()
    // Verify: headerList.get('x-custom') works
  })

  it("should handle async draftMode() call", async () => {
    // Test: const draft = await draftMode()
    // Verify: draft.isEnabled works
  })
})
```

### 3. Proxy (Middleware) Tests

**File:** `__tests__/proxy.test.ts`

```ts
describe("Proxy (Next.js 16 Middleware)", () => {
  it("should properly import auth from lib/auth", async () => {
    // Verify auth object is available
    // Test: session validation works
  })

  it("should enforce rate limiting", async () => {
    // Make 21+ requests in 60s
    // Verify: 429 response on 21st request
  })

  it("should apply CSP headers", async () => {
    // Verify: CSP header present in response
    // Content-Security-Policy: default-src 'self'; ...
  })

  it("should redirect unauthenticated users", async () => {
    // Verify: /dashboard redirects to /login when not authenticated
  })

  it("should allow access to public routes", async () => {
    // Verify: /, /login, /signup accessible without auth
  })
})
```

### 4. Image Optimization Tests

**File:** `__tests__/image-optimization.test.ts`

```ts
describe("Image Optimization (v16 changes)", () => {
  it("should use quality=75 for optimized images", async () => {
    // Verify images generated with quality=75
  })

  it("should use 4h (14400s) minimumCacheTTL", async () => {
    // Verify cache headers: max-age=14400
  })

  it("should not include size=16 in imageSizes", async () => {
    // Verify imageSizes: [32, 48, 64, 96, 128, 256, 384]
  })

  it("should limit redirects to maximum of 3", async () => {
    // Verify image redirects are limited
  })
})
```

### 5. Cache API Tests

**File:** `__tests__/cache-api.test.ts`

```ts
describe("Cache APIs (Next.js 16)", () => {
  it("should support revalidateTag with 'max' profile", async () => {
    // Test: revalidateTag('posts', 'max')
    // Verify: long-lived cache behavior
  })

  it("should support updateTag for immediate revalidation", async () => {
    // Test: updateTag('user-123')
    // Verify: cache invalidated and refreshed immediately
  })

  it("should support refresh for uncached data", async () => {
    // Test: refresh()
    // Verify: only uncached portions refreshed
  })
})
```

---

## Integration Tests

### User Authentication Flow
```bash
# Test scenario:
1. User visits /signup
2. Fills form and submits
3. Email verification sent
4. User clicks verification link
5. Redirected to /login
6. User logs in
7. Redirected to /dashboard
8. Session persists across navigation
```

### Chat Interaction Flow
```bash
# Test scenario:
1. User navigates to /dashboard/chat
2. Component loads with default message
3. User types message
4. Message submitted to /api/chat
5. Streaming response received
6. Messages displayed in chat
7. Can retry messages
```

### Payment Processing Flow
```bash
# Test scenario:
1. User navigates to /payment/checkout
2. Selects plan (basic/pro/enterprise)
3. Submits payment via Stripe
4. Webhook received and processed
5. Subscription activated
6. User sees premium features unlocked
```

### Admin Operations Flow
```bash
# Test scenario:
1. Admin logs in
2. Navigates to /admin/email-management
3. Triggers bulk email send
4. Rate limiting enforced (40 req/5min)
5. Email metrics tracked
6. Audit log recorded
```

---

## End-to-End (E2E) Testing

### Using Playwright

Create `/e2e/tests/basic-flows.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('Login and Chat Flow', () => {
  test('should complete authentication and access chat', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000')
    
    // Click login
    await page.click('a:has-text("Login")')
    await expect(page).toHaveURL('/login')
    
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    
    // Submit
    await page.click('button:has-text("Sign In")')
    
    // Verify redirect
    await expect(page).toHaveURL('/dashboard')
    
    // Navigate to chat
    await page.click('a:has-text("Chat")')
    await expect(page).toHaveURL('/dashboard/chat')
    
    // Send message
    await page.fill('textarea', 'Hello AI')
    await page.click('button:has-text("Send")')
    
    // Verify message sent
    await expect(page.locator('text=Hello AI')).toBeVisible()
  })
})
```

---

## Performance Testing

### Build Time Validation

```bash
# Before (Next.js 15 with Webpack)
# Expected: 45-60 seconds
pnpm run build
# Measure: grep "ready" logs

# After (Next.js 16 with Turbopack)
# Expected: 10-15 seconds (3x faster)
# Target: Not exceeding 30 seconds
```

### Bundle Size Analysis

```bash
# Analyze bundle
npm run build -- --analyze

# Check results in .next/analyze/ directory
# Verify: No increase in main bundle size
# Target: < 500KB gzipped main bundle
```

### Runtime Performance

```bash
# Load testing with Apache Bench
ab -n 1000 -c 100 https://runash.in/api/health

# Metrics to track:
# - Requests per second (RPS)
# - Time per request (mean)
# - Time per request (95th percentile)
# - Connection errors (should be 0)
```

---

## Validation Checklist

### Code Quality
- [ ] `pnpm run type-check` passes (no TypeScript errors)
- [ ] `pnpm run lint` passes (no linting issues)
- [ ] All 77 tests passing
- [ ] New async params tests passing
- [ ] Coverage maintained at >70%

### Build Validation
- [ ] `pnpm run build` completes successfully
- [ ] Build time: Turbopack 10-15 seconds
- [ ] Bundle size: No significant increase
- [ ] No build warnings in next.config.ts
- [ ] All env variables properly typed

### Runtime Validation
- [ ] App starts: `pnpm run start`
- [ ] Health check endpoint: GET /api/health → 200
- [ ] No console errors on startup
- [ ] CSP headers present
- [ ] Rate limiting active
- [ ] Auth flows working

### Feature Validation
- [ ] Login/signup flow works
- [ ] Chat messages send and receive
- [ ] Payment checkout functional
- [ ] Admin operations accessible
- [ ] Email delivery working
- [ ] Database queries performing
- [ ] Cache working properly

### Security Validation
- [ ] HTTPS enforced
- [ ] Secrets not exposed in code
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Auth tokens encrypted
- [ ] SQL injection prevention working
- [ ] XSS prevention working

### Performance Validation
- [ ] Page load time < 3 seconds
- [ ] API response time p95 < 300ms
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals within targets:
  - LCP: < 2.5s
  - FID: < 100ms
  - CLS: < 0.1

---

## Regression Testing

### Manual Regression Tests (15 min walk-through)

1. **Authentication (3 min)**
   - [ ] Sign up with new account
   - [ ] Email verification
   - [ ] Login
   - [ ] Logout
   - [ ] Password reset flow

2. **Dashboard (3 min)**
   - [ ] Load dashboard
   - [ ] Navigate between sections
   - [ ] Settings page
   - [ ] API keys
   - [ ] Profile update

3. **Chat (3 min)**
   - [ ] Send message
   - [ ] Receive response
   - [ ] Retry message
   - [ ] New conversation
   - [ ] Save conversation

4. **Payment (3 min)**
   - [ ] Select plan
   - [ ] Checkout flow
   - [ ] Payment success
   - [ ] Invoice download
   - [ ] Subscription management

5. **Admin (3 min)**
   - [ ] Access admin panel
   - [ ] View analytics
   - [ ] Send bulk email
   - [ ] User management
   - [ ] System health

---

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/nextjs-upgrade.yml`:

```yaml
name: Next.js 16 Upgrade Tests

on:
  push:
    branches: [main, v0/*]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      - run: pnpm run type-check
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Known Issues & Workarounds

### Issue 1: hydration mismatch on async params
**Workaround:** Ensure client renders same data as server by awaiting params

### Issue 2: TypeScript not recognizing Promise<params>
**Workaround:** Regenerate types with `npx next typegen`

### Issue 3: Metadata generation with dynamic routes
**Workaround:** Use `generateMetadata()` for dynamic metadata

---

## Post-Deployment Testing

### Week 1 Monitoring
- Daily: Error rate check (target: < 0.01%)
- Daily: Performance metrics review
- Daily: Database health check
- Daily: API latency review

### Week 2 Optimization
- Analyze slow endpoints
- Optimize cache strategy
- Review database queries
- Identify optimization opportunities

### Week 3 Stabilization
- Finalize performance baselines
- Document optimization results
- Plan future improvements
- Archive upgrade documentation

---

## Testing Resources

- [Node.js Test Runner Docs](https://nodejs.org/api/test.html)
- [Playwright Testing](https://playwright.dev)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

## Success Criteria

| Metric | Target | Acceptable |
|--------|--------|-----------|
| Test Pass Rate | 100% | > 95% |
| TypeScript Errors | 0 | 0 |
| Linting Violations | 0 | 0 |
| Build Time | < 15s | < 30s |
| Build Success | 100% | 100% |
| Bundle Size | ≤ current | +10% max |
| Lighthouse Score | > 90 | > 85 |
| Error Rate | < 0.01% | < 0.1% |
| P95 Latency | < 300ms | < 500ms |
