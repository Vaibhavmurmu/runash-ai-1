# Next.js 16 Deployment Strategy & Rollout Plan

**Timeline:** 2026-03-10 to 2026-03-17  
**Risk Level:** Medium (Breaking changes handled, but large scope)  
**Rollback Window:** 24 hours (keep v15 build available)

---

## Phase Timeline

### Pre-Deployment (March 5-8)

**Day 1-2: QA Validation**
- [ ] All tests passing on v0 branch
- [ ] Manual regression testing completed
- [ ] Performance baseline measured
- [ ] Security review passed

**Day 3-4: Preview Deployment**
- [ ] Deploy to Vercel Preview
- [ ] Run Lighthouse audit
- [ ] Test critical user flows
- [ ] Performance comparison with production

**Day 5: Approval & Final Checks**
- [ ] Code review complete
- [ ] Deployment checklist signed off
- [ ] Rollback procedure verified
- [ ] On-call team briefed

---

### Deployment (March 10-11)

**T-0 (Monday 9 AM)**
- Merge v0/nextjs-16-upgrade → main branch
- GitHub Actions CI/CD pipeline triggers
- Build validation: Turbopack, tests, type-check

**T+1 (Monday 10 AM)**
- Deployment to Vercel staging environment
- Health check endpoint validation
- Smoke test critical paths

**T+2 (Monday 2 PM)**
- Canary deployment: 10% traffic for 4 hours
- Monitor: Error rate, latency, Sentry alerts
- Decision point: Proceed or rollback

**T+6 (Monday 6 PM)**
- If canary successful: Proceed to gradual rollout
- Increase to 25% traffic
- Continue monitoring

**T+12 (Tuesday 2 PM)**
- Increase to 50% traffic
- Extend monitoring window to 24 hours
- Review metrics continuously

**T+24 (Wednesday 2 PM)**
- Full production rollout (100% traffic)
- Keep v15 build available for 24 hours
- Begin post-deployment validation

---

## Canary Deployment Configuration

### Vercel Canary Setup

1. **Create Canary Deployment**
   ```bash
   # In Vercel Dashboard:
   # Settings → Deployments → Create Test Deployment
   # Select: v0/nextjs-16-upgrade branch
   ```

2. **Traffic Split Configuration**
   ```
   Main (stable): 90%
   Canary (new): 10%
   
   Duration: 4 hours
   Auto-promotion: Disabled (manual review)
   ```

3. **Health Checks**
   ```bash
   # Endpoint to monitor
   GET /api/health
   
   Expected response:
   {
     "status": "ok",
     "database": { "status": "ok" },
     "redis": { "status": "ok" },
     "externalAPIs": { "status": "ok" }
   }
   
   Success criteria:
   - Status 200
   - Response time < 500ms
   - Error rate < 0.5%
   ```

---

## Monitoring During Deployment

### Critical Metrics Dashboard

**Real-time Monitoring (Refresh Every 5 Minutes)**

1. **Error Rate**
   ```
   Source: Sentry
   Target: < 0.1% (< 1 error per 1000 requests)
   Alert Threshold: > 0.5%
   
   Monitor:
   - Auth errors
   - API errors
   - 500 errors
   - Unhandled exceptions
   ```

2. **Response Latency**
   ```
   Source: Vercel Analytics
   Target P95: < 300ms
   Alert Threshold: > 500ms
   
   Monitor:
   - API response time
   - Page load time
   - Database query time
   ```

3. **Traffic Distribution**
   ```
   Track percentage of requests hitting:
   - Canary deployment (new v16 build)
   - Stable deployment (current v15 build)
   
   Verify: 10% canary, 90% stable
   ```

4. **Database Health**
   ```
   Monitor:
   - Connection pool usage
   - Query performance
   - Slow query count
   - Connection errors
   
   Alert: Pool > 90% or slow queries spike
   ```

5. **Cache Performance**
   ```
   Monitor:
   - Hit ratio (target: > 80%)
   - Cache misses
   - Revalidation frequency
   
   Alert: Hit ratio < 50%
   ```

### Monitoring Tools

**Vercel Analytics Dashboard**
- Error rate graph
- Response time distribution
- Traffic distribution (canary %)
- Core Web Vitals

**Sentry Dashboard**
- Real-time error stream
- Error rate graph
- Top errors by frequency
- User affected count

**Custom Health Check Script**
```bash
#!/bin/bash
# scripts/monitor-deployment.sh

while true; do
  timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  
  # Check health endpoint
  response=$(curl -s -o /dev/null -w "%{http_code}" https://runash.in/api/health)
  
  # Check Sentry error rate
  error_rate=$(curl -s -H "Authorization: Bearer $SENTRY_TOKEN" \
    https://sentry.io/api/0/organizations/runash/stats/ | jq '.rejected_rate')
  
  echo "[$timestamp] Health: $response | Error Rate: $error_rate%"
  
  sleep 60
done
```

---

## Rollback Procedures

### Automatic Rollback Triggers

**Immediate Rollback (No Discussion)**
1. Error rate sustained > 1% for 5 minutes
2. Database connection failures (timeout > 30s)
3. Auth system completely down
4. Payment processing failures
5. Data corruption detected

**Manual Review Rollback (Team Decision)**
1. Performance degradation (P95 > 1000ms)
2. Unexpected behavior in critical paths
3. Cascading failures in dependent services
4. Resource exhaustion (CPU/Memory > 95%)

### Rollback Execution

**Option 1: Vercel Dashboard (Fastest)**
```
1. Go to Vercel Project
2. Settings → Deployments
3. Select last stable deployment (v15 build)
4. Click "Promote to Production"
5. Confirm and deploy
6. Verify: curl https://runash.in/api/health
```

**Option 2: Git Revert (Git-Based)**
```bash
# Get last stable commit
git log --oneline | head -20

# Revert to previous version
git revert HEAD
git push origin main

# Or force revert (if needed)
git reset --hard <commit-hash>
git push -f origin main
```

**Option 3: Manual Docker Rollback (If Self-Hosted)**
```bash
# Pull last stable image
docker pull runash:v15.5.10

# Stop running container
docker stop runash-prod

# Start stable version
docker run -d --name runash-prod runash:v15.5.10

# Verify
curl http://localhost:3000/api/health
```

### Post-Rollback Steps

1. **Notify Stakeholders**
   - Send status update to #deployments Slack
   - Notify customers if significant downtime
   - Create incident post-mortem ticket

2. **Investigation**
   - Review error logs (Sentry)
   - Check deployment logs
   - Analyze metrics
   - Identify root cause

3. **Fix & Redeploy**
   - Address identified issues
   - Deploy to preview environment
   - Run full test suite
   - Schedule redeploy attempt

---

## Post-Deployment Validation (24-48 hours)

### Day 1 (Wednesday after rollout)

**Immediate Checks (First 4 hours)**
- [ ] All critical user paths working
- [ ] No spike in error rate
- [ ] Database performance normal
- [ ] API response times stable
- [ ] Email delivery functioning
- [ ] Payment processing working

**Extended Checks (First 24 hours)**
- [ ] Test all authentication methods
  - [ ] Email/password login
  - [ ] OAuth (Google, GitHub if available)
  - [ ] Magic link verification
  - [ ] Password reset flow

- [ ] Verify API functionality
  - [ ] Chat API streaming
  - [ ] Payment webhooks
  - [ ] Admin operations
  - [ ] User data retrieval

- [ ] Performance validation
  - [ ] Build time improvement: 3x faster expected
  - [ ] Bundle size: maintained or reduced
  - [ ] Page load metrics stable
  - [ ] No new performance regressions

- [ ] Database validation
  - [ ] Query performance normal
  - [ ] Connection pool healthy
  - [ ] Backup status: OK
  - [ ] Replication lag: < 1s

### Day 2 (Thursday after rollout)

**Stability Assessment**
- [ ] 48-hour error rate < 0.01%
- [ ] No intermittent failures
- [ ] Cache working properly
- [ ] Database stable
- [ ] All integrations responding

**Comparison Metrics**
```
Metric                    v15 Baseline    v16 Target
Build Time               45-60s          10-15s (3x faster)
Page Load Time           1500ms          1400ms (maintained)
API P95 Latency          250ms           250ms (maintained)
Error Rate               0.001%          0.001% (stable)
Lighthouse Score         92              92 (maintained)
```

---

## Production Rollout Strategy

### Traffic Distribution Schedule

```
Time        Canary (v16)    Stable (v15)    Decision
T+0         10%             90%             Launch canary
T+4         25% (if OK)     75%             Increase if stable
T+8         50% (if OK)     50%             Full rollout ready
T+12        75% (if OK)     25%             Nearly complete
T+24        100%            0%              Full production
```

### Success Criteria at Each Stage

**Stage 1 (10% - 4 hours)**
✓ Error rate < 0.5%
✓ P95 latency < 400ms
✓ No database connection issues
✓ Auth flows working
→ Proceed to Stage 2

**Stage 2 (25% - 4 hours)**
✓ Error rate < 0.2%
✓ P95 latency < 350ms
✓ Cache hit rate > 80%
✓ All APIs responding
→ Proceed to Stage 3

**Stage 3 (50% - 4 hours)**
✓ Error rate < 0.1%
✓ P95 latency < 300ms
✓ Zero database timeouts
✓ Payment processing OK
→ Proceed to Stage 4

**Stage 4 (75% - 4 hours)**
✓ Sustained low error rate
✓ Performance baseline met
✓ No user complaints
✓ All critical systems OK
→ Proceed to Stage 5 (Full Rollout)

**Stage 5 (100% - permanent)**
✓ Decommission v15 build (after 24h)
✓ Update documentation
✓ Archive upgrade artifacts

---

## Communication Plan

### Pre-Deployment (March 9)

**Message to Customers**
```
Subject: Scheduled Maintenance Window (March 10)

We'll be upgrading our infrastructure to Next.js 16 on March 10, 2026
from 9 AM - 5 PM PST for improved performance and security.

Expected impact: None (gradual rollout with automatic fallback)
Duration: < 1 second for any individual request
Status: https://runash.in/status

Questions? Contact support@runash.in
```

### During Deployment

**Slack #deployments Channel**
```
09:00 [START] Beginning Next.js 16 deployment
09:15 [INFO] Canary deployment ready (10% traffic)
10:00 [MONITORING] Error rate 0.08%, P95 latency 280ms - all good
14:00 [DECISION] Proceeding to 25% traffic (4h canary complete)
18:00 [DECISION] Proceeding to 50% traffic (extended monitoring)
22:00 [DECISION] Proceeding to full rollout
10:00 [COMPLETE] Full production migration complete ✓
```

### Post-Deployment (March 11)

**Status Update Email**
```
Subject: Next.js 16 Upgrade Complete

Great news! We've successfully upgraded to Next.js 16 with:
- 3x faster builds (Turbopack)
- Improved performance
- Enhanced security features
- Better developer experience

No action required on your end.
Learn more: https://runash.in/blog/nextjs16-upgrade
```

---

## Team Responsibilities

### DevOps/Release Manager
- [ ] Schedule deployment
- [ ] Monitor canary deployment
- [ ] Execute traffic shifts
- [ ] Manage rollback if needed
- [ ] Post-deployment validation

### Engineering Lead
- [ ] Code review final changes
- [ ] Approve deployment
- [ ] On-call during deployment
- [ ] Incident response lead

### QA/Testing
- [ ] Pre-deployment testing
- [ ] Regression testing
- [ ] Smoke testing post-deploy
- [ ] Performance validation

### Product/Support
- [ ] Customer notification
- [ ] Support team briefing
- [ ] Customer communication
- [ ] Issue triage

### Database Administrator
- [ ] Monitor database during deployment
- [ ] Verify backup integrity
- [ ] Check connection pool
- [ ] Performance monitoring

---

## Contingency Plans

### Scenario 1: Canary Fails (Error Rate Spike)

**If error rate > 0.5% in first hour:**
1. Immediately halt traffic to canary
2. Investigate error logs (Sentry)
3. Revert to v15 build
4. Schedule post-mortem
5. Fix issues and retry

**Action:** ROLLBACK

### Scenario 2: Database Performance Degrades

**If query time increases > 50%:**
1. Check query logs for expensive queries
2. Verify connection pool hasn't exhausted
3. Consider database failover
4. If unable to recover: ROLLBACK

**Action:** INVESTIGATE & FIX or ROLLBACK

### Scenario 3: Auth System Issues

**If login fails for > 1% of users:**
1. Check better-auth configuration
2. Verify database connectivity
3. Review error logs
4. If unresolvable within 15min: ROLLBACK

**Action:** IMMEDIATE ROLLBACK

### Scenario 4: Payment Processing Down

**If Stripe webhook failures > 5%:**
1. Check webhook configuration
2. Verify API key validity
3. Check rate limiting
4. If unresolvable: ROLLBACK

**Action:** IMMEDIATE ROLLBACK

---

## Success Metrics

**Deployment is successful when:**

✓ Zero critical incidents during rollout  
✓ Error rate remains < 0.01%  
✓ Performance metrics maintained or improved  
✓ All user flows working normally  
✓ Build time improved 3x (Turbopack)  
✓ No data loss or corruption  
✓ Customer support has zero upgrade-related tickets  

---

## Post-Upgrade Tasks (Week 2)

- [ ] Archive upgrade documentation
- [ ] Update team playbooks
- [ ] Schedule knowledge transfer session
- [ ] Plan next optimization phase
- [ ] Gather lessons learned
- [ ] Update runbooks for Next.js 16
- [ ] Plan deprecation of v15 monitoring

---

## References

- [Vercel Deployment Docs](https://vercel.com/docs/concepts/deployments)
- [Next.js 16 Production Checklist](https://nextjs.org/docs/deployment)
- [Rollback Procedures](docs/ROLLBACK_PROCEDURES.md)
- [Emergency Contacts](docs/EMERGENCY_CONTACTS.md) (internal)
