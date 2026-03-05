# Production Deployment Guide for Next.js 16 Upgrade

**Last Updated:** 2026-03-05  
**Target Environment:** Production  
**Deployment Platform:** Vercel

---

## Pre-Deployment Checklist

### Environment Setup
- [ ] All environment variables configured in Vercel project
- [ ] Database connections tested from production environment
- [ ] API keys rotated and updated
- [ ] Secrets stored in Vercel Environment Secrets (not committed)
- [ ] CDN configured for static assets
- [ ] Analytics initialized

### Code Quality
- [ ] All TypeScript errors resolved (`pnpm run type-check`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] All tests passing (`pnpm run test`)
- [ ] No console errors in production build
- [ ] Security audit clean (`pnpm audit --production`)

### Performance
- [ ] Lighthouse scores reviewed (target: >90)
- [ ] Core Web Vitals measured
- [ ] Build time baseline established (Turbopack: 10-15s expected)
- [ ] Bundle analysis completed
- [ ] Image optimization verified
- [ ] Caching strategy configured

### Security
- [ ] HTTPS enforced
- [ ] CSP headers configured and tested
- [ ] CORS policies verified
- [ ] Rate limiting enabled
- [ ] Dependencies audited for vulnerabilities
- [ ] Secrets not exposed in code
- [ ] Auth tokens properly encrypted

---

## Environment Variables

### Required for All Environments

#### Core Application
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://runash.in
```

#### Authentication & Session
```bash
BETTER_AUTH_SECRET=<random-32-character-string>
BETTER_AUTH_URL=https://runash.in
AUTH_PROVIDER=BETTER-AUTH
BETTER_AUTH_EMAIL_VERIFICATION_CALLBACK_URL=/login?emailVerified=1
```

**How to Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### Database
```bash
DATABASE_URL=postgres://user:password@host:port/database
NEON_API_KEY=<neon-api-key>
```

**Connection String Format:**
```
postgresql://username:password@hostname.neon.tech:5432/databasename
```

#### Email Services
```bash
RESEND_API_KEY=re_<your-resend-key>
RESEND_WEBHOOK_SECRET=whsec_<webhook-secret>
EMAIL_FROM=noreply@runash.in
CONTACT_EMAIL=team@runash.in
```

#### Payment Processing
```bash
STRIPE_PUBLIC_KEY=pk_live_<your-public-key>
STRIPE_SECRET_KEY=sk_live_<your-secret-key>
STRIPE_WEBHOOK_SECRET=whsec_<webhook-secret>
STRIPE_PRODUCT_ID_BASIC=prod_<id>
STRIPE_PRODUCT_ID_PRO=prod_<id>
STRIPE_PRODUCT_ID_ENTERPRISE=prod_<id>
```

#### AI/LLM Services
```bash
OPENAI_API_KEY=sk_<your-key>
GROQ_API_KEY=<your-groq-key>
ANTHROPIC_API_KEY=sk-ant-<your-key>
AI_GATEWAY_API_KEY=<gateway-key-if-not-using-default>
```

#### Storage
```bash
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
```

#### Cache & Session Store
```bash
UPSTASH_REDIS_REST_URL=https://<endpoint>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
REDIS_CONNECTION_POOL_SIZE=20
```

#### Monitoring & Analytics
```bash
VERCEL_ANALYTICS_ID=<analytics-id>
SENTRY_DSN=https://<key>@sentry.io/<project>
ENVIRONMENT=production
```

#### Feature Flags
```bash
NEXT_PUBLIC_FEATURES_ENABLED=chat,payment,streaming
NEXT_PUBLIC_API_VERSION=v1
```

---

## Vercel Project Configuration

### Build Settings
```
Framework: Next.js
Build Command: next build
Output Directory: .next
Install Command: pnpm install --frozen-lockfile
```

### Function Configuration
```
Max Duration: 60 seconds (default)
Memory: 3008 MB (standard)
```

### Environment Variables
1. Go to **Settings → Environment Variables**
2. Add all variables from section above
3. Set visibility: **Production, Preview, Development** (as appropriate)
4. Rotate secrets quarterly

### Deployment Settings
```
Auto-deploy on push: main branch
Preview deployments: All pull requests
```

---

## Security Hardening

### Content Security Policy (CSP)

Currently configured in `/proxy.ts`:
```ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https:;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
```

**Post-Migration Improvements:**
- Remove 'unsafe-eval' if possible
- Restrict script domains further
- Add nonce for inline scripts
- Test with CSP validator tool

### CORS Configuration

Update in API routes:
```ts
response.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_URL)
response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
response.headers.set("Access-Control-Max-Age", "3600")
```

### Rate Limiting (Already Configured)

Configured in `/proxy.ts`:
- Auth endpoints: 20 req/min per IP
- Admin endpoints: 40 req/5min per IP
- General API: 100 req/min per IP
- Sensitive actions: 10 req/15min per IP

**Production Enhancement:**
Consider using Upstash Redis for distributed rate limiting:
```ts
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

const { success } = await ratelimit.limit(identifier)
```

---

## Database Optimization

### Neon (PostgreSQL) Configuration

**Connection Pooling:**
```bash
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=require&connection_limit=25&pool_timeout=30
```

**Recommended Settings:**
```
Connection Pool Size: 20-25 (production)
Idle Timeout: 300s (5 minutes)
SSL Mode: require
```

### Backup Strategy

**Daily Automated Backups:**
- Neon provides daily automated backups
- Retention: 7 days minimum
- Verify restore procedure monthly

**Manual Backup:**
```bash
pg_dump postgresql://user:password@host:port/db > backup.sql
```

---

## Monitoring & Logging

### Sentry Configuration

1. **Create Sentry Project:**
   - Go to sentry.io
   - Create new project for Next.js
   - Copy DSN to SENTRY_DSN env var

2. **Initialize in app:**
   ```ts
   // lib/monitoring/sentry.ts
   import * as Sentry from "@sentry/nextjs"
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.ENVIRONMENT,
     tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
   })
   ```

### Logging Strategy

**API Events:** Structured JSON logging to stdout
**Performance Metrics:** Vercel Analytics + Sentry
**Error Tracking:** Sentry + console logging
**Audit Logs:** Database table with immutable records

### Health Check Endpoint

Create `app/api/health/route.ts`:
```ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalAPIs: await checkExternalAPIs(),
  }
  
  const healthy = Object.values(checks).every(c => c.status === 'ok')
  
  return Response.json(checks, {
    status: healthy ? 200 : 503,
  })
}
```

---

## Performance Optimization

### Image Optimization

**next.config.mjs:**
```ts
images: {
  minimumCacheTTL: 14400,  // 4 hours
  imageSizes: [32, 48, 64, 96, 128, 256, 384],
  qualities: [75],
  dangerouslyAllowLocalIP: false,
  maximumRedirects: 3,
}
```

### Caching Strategy

**Static Assets (1 month):**
```ts
// In page/layout
export const revalidate = 2592000  // 30 days
```

**Dynamic Content (5 minutes):**
```ts
export const revalidate = 300  // 5 minutes
```

**On-Demand Revalidation:**
```ts
import { revalidateTag } from "next/cache"

// Invalidate specific cache
export async function updateUser(userId: string) {
  // ... database update ...
  revalidateTag(`user-${userId}`, "max")
}
```

### Bundle Analysis

```bash
# Install analyzer
pnpm add -D @next/bundle-analyzer

# Create next.config.js wrapper
WITH_BUNDLE_ANALYZER=true pnpm run build
```

---

## Deployment Procedure

### Pre-Deployment (2 days before)

1. **Code Review:**
   ```bash
   git log main...v0/nextjs-16-upgrade
   ```

2. **Test in Preview:**
   - Push to feature branch
   - Vercel auto-creates preview deployment
   - Run Lighthouse audit
   - Manual smoke test (15 min)

3. **Performance Baseline:**
   ```bash
   pnpm run build
   # Record: build time, bundle size
   pnpm run start
   # Test response times with Apache Bench:
   ab -n 100 -c 10 https://preview.runash.in/api/health
   ```

### Deployment Day

**1. Canary Deployment (10% traffic, 4 hours)**

Set in Vercel:
- Traffic split: 90% current, 10% new
- Monitor error rates, latency
- Proceed if: error rate < 0.1%, latency stable

```bash
# Monitor command
curl https://runash.in/api/health -s | jq .
```

**2. Gradual Rollout (if canary succeeds)**

- Hour 0-4: 10% (canary)
- Hour 4-8: 25% traffic
- Hour 8-12: 50% traffic
- Hour 12+: 100% (full rollout)

**3. Monitoring During Rollout**

Watch these metrics:
- Error rate (target: < 0.1%)
- P95 response time (target: < 300ms)
- Sentry error count
- Database connection pool
- Cache hit ratio

### Rollback Plan

**If Critical Issues Occur:**
```bash
# Option 1: Vercel Dashboard
Settings → Deployments → Select last stable → Promote to Production

# Option 2: Git Revert
git revert HEAD
git push origin main
```

**Automatic Rollback Triggers:**
- Error rate > 1% sustained (5 min)
- P95 latency > 1000ms sustained (5 min)
- Database connection failures
- Auth system down

---

## Post-Deployment (24-48 hours)

### Validation Checklist
- [ ] Core user flows work (login, chat, payment)
- [ ] API response times stable
- [ ] No spike in Sentry errors
- [ ] Database performance normal
- [ ] Email delivery working
- [ ] Webhooks processing correctly
- [ ] Cache hit ratios good (>80%)

### Performance Analysis
```bash
# Compare build times
# v15 Webpack: ~45-60s
# v16 Turbopack: ~10-15s (target 3x faster)

# Compare bundle sizes
# Should be similar or smaller

# Runtime performance
# Check Vercel Analytics dashboard
# Core Web Vitals should not degrade
```

### Optimization Opportunities
- Review slow API endpoints in Sentry
- Optimize images with high cache misses
- Database query analysis
- Consider caching layer for frequently accessed data

---

## Maintenance & Monitoring

### Daily Checks
```bash
# Health endpoint
curl https://runash.in/api/health

# Error rate (Sentry dashboard)
# Target: < 0.01%

# Performance metrics (Vercel Analytics)
# Target: LCP < 2.5s, FID < 100ms
```

### Weekly Reviews
- Sentry error trends
- Database query performance
- Storage usage growth
- Cost analysis

### Monthly Tasks
- Security audit
- Dependency updates
- Performance optimization review
- Capacity planning
- Secrets rotation (quarterly minimum)

---

## Troubleshooting

### Build Failures

**Error: "Module not found"**
```bash
# Clear dependencies and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run build
```

**Error: "Out of memory during build"**
```bash
# Increase build memory in Vercel
# Settings → Function → Memory: 3008 MB (max)
```

### Runtime Issues

**Error: "Async params not awaited"**
```tsx
// Wrong
const id = props.params.id

// Correct
const { id } = await props.params
```

**Error: "Cookies/headers not found"**
```ts
// Wrong
const token = cookies().get("auth")

// Correct (v16)
const token = (await cookies()).get("auth")
```

### Performance Issues

**Slow Initial Load**
- Check Lighthouse report
- Enable response compression
- Optimize images
- Review CSS/JS bundles

**Slow API Endpoints**
- Monitor Sentry
- Check database query logs
- Add caching layer
- Consider pagination

---

## Success Metrics

**Build Time:**
- Target: 10-15 seconds (3x faster than Webpack)
- Acceptable: < 30 seconds

**Performance:**
- Lighthouse Score: > 90
- LCP: < 2.5s
- CLS: < 0.1
- FID: < 100ms

**Stability:**
- Error Rate: < 0.01%
- Uptime: > 99.9%
- Database Availability: 100%

**Cost:**
- No significant increase in compute costs
- Build time savings offset by potential runtime changes
- Storage unchanged

---

## References

- [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments)
- [Next.js 16 Documentation](https://nextjs.org)
- [Neon PostgreSQL](https://neon.tech)
- [Sentry Error Tracking](https://sentry.io)
- [Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode)
