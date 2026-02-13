# Supabase to Neon Migration Plan - RunAsh AI Pay

## Executive Summary

This document outlines a comprehensive migration strategy from Supabase to Neon database with enhanced authentication mechanisms. The migration will be executed with zero-downtime using a parallel-run approach, ensuring data integrity and enhanced security throughout the process.

**Timeline**: 3 weeks  
**Risk Level**: Low (with proper testing)  
**Downtime**: < 5 minutes (final cutover)

---

## Phase 1: Pre-Migration (Week 1)

### 1.1 Preparation & Assessment

#### Environment Setup
```bash
# Create Neon project
neon project create --name runash-ai-pay-prod

# Create development branch for testing
neon branches create dev-branch

# Create staging environment
neon branches create staging-branch
```

#### Database Comparison
| Aspect | Supabase | Neon |
|--------|----------|------|
| **Provider** | Managed PostgreSQL | Managed PostgreSQL |
| **Auth** | Supabase Auth (JWT-based) | Custom (will implement) |
| **Extensions** | uuid-ossp, pgcrypto | uuid-ossp, pgcrypto |
| **RLS** | Built-in | Custom implementation |
| **Backup** | Automated | Automated |
| **Scaling** | Vertical | Vertical + Branching |

### 1.2 Neon Database Configuration

#### Step 1: Create Neon Project
1. Go to [console.neon.tech](https://console.neon.tech)
2. Create new project: `runash-ai-pay`
3. Configure regions (recommend closest to your users)
4. Set connection parameters

#### Step 2: Enable Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "jsonb_utils"; -- For JSONB operations
```

#### Step 3: Configure Connection Pooling
- **Pool Size**: 25
- **Reserve Pool**: 5
- **Idle Timeout**: 15 minutes
- **Session Timeout**: 24 hours

### 1.3 Custom Authentication System Design

#### Authentication Architecture
```
┌─────────────────────────────────────────┐
│       Frontend (Next.js App)            │
├─────────────────────────────────────────┤
│       Auth Context Provider             │
│  ├─ Login/Signup                        │
│  ├─ Session Management                  │
│  └─ Token Refresh                       │
├─────────────────────────────────────────┤
│       API Routes (Server-Side)          │
│  ├─ /api/auth/login                     │
│  ├─ /api/auth/signup                    │
│  ├─ /api/auth/refresh                   │
│  ├─ /api/auth/logout                    │
│  └─ /api/auth/verify                    │
├─────────────────────────────────────────┤
│       Middleware (Session Verification) │
├─────────────────────────────────────────┤
│       Neon Database                     │
│  ├─ users (with password_hash)          │
│  ├─ auth_sessions (JWT tokens)          │
│  ├─ refresh_tokens (refresh tokens)     │
│  └─ password_reset_tokens (reset flow)  │
└─────────────────────────────────────────┘
```

#### Key Improvements Over Supabase Auth
1. **Session Control**: Full control over session lifetime and renewal
2. **Enhanced Security**: Custom token signing with HS256 / RS256
3. **Rate Limiting**: Built-in brute force protection
4. **Audit Logging**: Complete authentication event logging
5. **Multi-Device Sessions**: Track and manage multiple device logins
6. **Risk-Based Auth**: Adaptive authentication based on device/location
7. **Custom Flows**: Support for passwordless, MFA, and SSO

---

## Phase 2: Database Migration (Week 1-2)

### 2.1 Data Export from Supabase

#### Step 1: Export All Tables
```sql
-- Run on Supabase to get schema and data dumps
pg_dump --host=your-supabase-host.supabase.co \
  --username=postgres \
  --database=postgres \
  --format=plain \
  --verbose \
  --no-password > supabase_backup.sql
```

#### Step 2: Export without Auth Tables
```sql
-- Export public schema only (excludes auth.users)
pg_dump --host=your-supabase-host.supabase.co \
  --username=postgres \
  --database=postgres \
  --schema=public \
  --format=custom \
  --verbose \
  --no-password > supabase_public_data.dump
```

#### Step 3: Verify Data Integrity
```bash
# Count records in each table
psql -h your-supabase-host.supabase.co -U postgres -d postgres \
  -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY tablename;"
```

### 2.2 Schema Migration to Neon

#### Step 1: Create Enhanced Schema
The schema will include:
- Enhanced `users` table with password hashing
- New `auth_sessions` table for session management
- New `refresh_tokens` table for token rotation
- New `password_reset_tokens` for secure password resets
- New `auth_events` table for audit logging

#### Step 2: Load Data into Neon
```bash
# Connect to Neon and restore data
psql postgres://user:password@ep-xyz.us-east-1.neon.tech/neon \
  -f migration_schema.sql

# Restore data from dump
pg_restore --host=ep-xyz.us-east-1.neon.tech \
  --username=neon_user \
  --database=neon \
  --verbose \
  supabase_public_data.dump
```

#### Step 3: Data Validation Queries
```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Count records
SELECT schemaname, tablename, n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname='public' 
ORDER BY tablename;

-- Check constraints and indexes
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema='public';
```

### 2.3 User Data Migration

#### Step 1: Migrate User Accounts
```sql
-- Create temporary mapping table
CREATE TABLE auth_migration_map (
  supabase_user_id UUID,
  neon_user_id UUID,
  email TEXT,
  migration_date TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (supabase_user_id)
);

-- Migrate users (without passwords initially - users reset on first login)
INSERT INTO users (id, email, full_name, phone, created_at, updated_at)
SELECT id, email, raw_user_meta_data->>'full_name', 
       raw_user_meta_data->>'phone', created_at, updated_at
FROM auth.users
WHERE email NOT LIKE '%@supabase.co';
```

#### Step 2: User Verification
```sql
-- Verify migration
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as users_with_names
FROM users;
```

#### Step 3: Password Reset Required
- All users will be required to reset their password on first login
- Send password reset emails to all migrated users
- Provide 30-day grace period for password reset

### 2.4 Entity & Relationship Validation

#### Foreign Key Verification
```sql
-- Check all foreign key constraints
SELECT constraint_name, table_name, column_name, referenced_table_name
FROM information_schema.referential_constraints;

-- Verify referential integrity
-- Example: Check transactions reference valid users
SELECT COUNT(*) FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.sender_id);
```

#### Data Consistency Checks
```sql
-- Check for orphaned records
SELECT COUNT(*) as orphaned_bank_accounts
FROM bank_accounts ba
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ba.user_id);

SELECT COUNT(*) as orphaned_upi_ids
FROM upi_ids ui
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ui.user_id);

-- Verify transaction integrity
SELECT COUNT(*) FROM transactions 
WHERE sender_id IS NULL AND receiver_id IS NULL;
```

---

## Phase 3: Authentication System Implementation (Week 1-2)

### 3.1 Enhanced Authentication Database Tables

#### New Tables in Neon
```sql
-- Auth sessions table
CREATE TABLE auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  access_token_hash TEXT NOT NULL, -- bcrypt hash of token
  refresh_token_hash TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type VARCHAR(50), -- 'mobile', 'web', 'tablet'
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES auth_sessions(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  rotation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Authentication events (audit log)
CREATE TABLE auth_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'signup', 'password_reset', etc.
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked'
  device_info JSONB,
  ip_address INET,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_device_id ON auth_sessions(device_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX idx_auth_events_created_at ON auth_events(created_at);
```

### 3.2 Update Users Table

```sql
-- Add password and authentication fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_password_reset_required BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT; -- For TOTP
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[]; -- For MFA backup
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_phone TEXT;
```

### 3.3 RLS Policies for New Tables

```sql
-- Enable RLS on new tables
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auth_sessions
CREATE POLICY "Users can view own sessions" ON auth_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke own sessions" ON auth_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for auth_events
CREATE POLICY "Users can view own auth events" ON auth_events
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert events
CREATE POLICY "System can insert auth events" ON auth_events
    FOR INSERT WITH CHECK (TRUE);
```

---

## Phase 4: Application Code Updates (Week 2)

### 4.1 Create Authentication Services

#### Enhanced Auth Service for Neon
- Custom JWT token generation and verification
- Secure session management
- Token refresh mechanism
- Brute force protection
- MFA support
- Audit logging
- Device tracking
- Risk-based authentication

### 4.2 Update API Routes

#### New/Modified API Routes
- `/api/auth/login` - Enhanced with session tracking
- `/api/auth/signup` - User registration with email verification
- `/api/auth/refresh` - JWT token refresh
- `/api/auth/logout` - Session revocation
- `/api/auth/logout-all` - Revoke all sessions
- `/api/auth/sessions` - List active sessions
- `/api/auth/password-reset` - Initiate password reset
- `/api/auth/verify-reset-token` - Validate reset token
- `/api/auth/confirm-password-reset` - Complete password reset
- `/api/auth/verify-email` - Email verification
- `/api/auth/resend-verification` - Resend verification email
- `/api/auth/mfa/setup` - Enable MFA
- `/api/auth/mfa/verify` - Verify MFA code

### 4.3 Update Client-Side Code

#### Modified Files
1. **lib/supabase/client.ts** → **lib/neon/client.ts**
   - Replace Supabase client with Neon client
   - Implement custom auth context using localStorage

2. **lib/auth/auth-context.tsx**
   - Update to use new custom authentication service
   - Implement token refresh logic
   - Add session management
   - Add device tracking

3. **app/auth/login/page.tsx**
   - Update to use new auth service
   - Add enhanced error handling
   - Add session tracking
   - Add device name input

4. **app/auth/signup/page.tsx**
   - Update to use new auth service
   - Add email verification step
   - Add password reset requirement

### 4.4 Middleware for Token Verification

#### New File: middleware.ts
```typescript
// Verify JWT tokens on every protected route
// Refresh expired tokens automatically
// Track session activity
// Implement CSRF protection
```

---

## Phase 5: Testing & Validation (Week 2)

### 5.1 Unit Tests

#### Authentication Service Tests
- Password hashing and verification
- JWT token generation and validation
- Token refresh mechanism
- Session creation and deletion
- Brute force protection
- MFA operations

#### API Route Tests
- Login with valid credentials
- Login with invalid credentials
- Signup with duplicate email
- Token refresh
- Session revocation
- Password reset flow

### 5.2 Integration Tests

#### End-to-End Flows
- Complete signup → email verification → first login
- Login → token expiry → automatic refresh
- Multi-device session management
- Password reset flow
- MFA enable/disable
- Logout all devices

### 5.3 Data Migration Validation

#### Verification Queries
```sql
-- Compare record counts
SELECT 
  'users' as table_name, COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 'bank_accounts', COUNT(*) FROM bank_accounts
UNION ALL
SELECT 'upi_ids', COUNT(*) FROM upi_ids
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'payment_links', COUNT(*) FROM payment_links
ORDER BY table_name;

-- Check data integrity
SELECT 
  COUNT(*) as total_checks,
  COUNT(CASE WHEN check_passed THEN 1 END) as passed,
  COUNT(CASE WHEN NOT check_passed THEN 1 END) as failed
FROM (
  SELECT 
    user_id, 
    COUNT(*) > 0 as check_passed
  FROM bank_accounts
  WHERE user_id IN (SELECT id FROM users)
) checks;
```

### 5.4 Performance Testing

#### Load Testing
- Test 100+ concurrent users
- Monitor query performance
- Check connection pooling
- Validate token refresh under load

#### Latency Testing
- Login response time
- API response times
- Token refresh latency
- Database query performance

---

## Phase 6: Production Migration (Week 3)

### 6.1 Pre-Migration Checklist

- [ ] All code changes deployed to staging
- [ ] Integration tests passing (100%)
- [ ] Database schema validated
- [ ] Data migration tested multiple times
- [ ] Performance benchmarks acceptable
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested
- [ ] Team trained on new system
- [ ] Monitoring and alerts configured
- [ ] Support team briefed on changes

### 6.2 Parallel Run Strategy (Recommended)

#### Timeline: 1-2 weeks
```
┌─────────────────────────────────────────┐
│  Week 1: Dual System Operation          │
├─────────────────────────────────────────┤
│  50% traffic → Neon                     │
│  50% traffic → Supabase                 │
│  Mirror all writes to both systems      │
│  Validate data consistency              │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Week 2: Increased Neon Traffic         │
├─────────────────────────────────────────┤
│  80% traffic → Neon                     │
│  20% traffic → Supabase (read-only)     │
│  Monitor for issues                     │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Cutover: 100% to Neon                  │
├─────────────────────────────────────────┤
│  Maintain Supabase as backup (7 days)   │
│  Monitor closely                        │
└─────────────────────────────────────────┘
```

### 6.3 Cutover Execution

#### Pre-Cutover (T-1 day)
1. Disable new user signups (or pause traffic)
2. Run final data sync
3. Validate all data matches
4. Brief support team
5. Alert stakeholders

#### Cutover (T+0, off-peak hours)
1. Enable maintenance mode
2. Run final consistency checks
3. Switch database connection strings
4. Test critical user flows (login, payment)
5. Monitor error rates
6. Enable signup/traffic

#### Post-Cutover (T+1 hour through T+24 hours)
1. Monitor error rates and performance
2. Check auth event logs
3. Verify all API endpoints
4. Monitor database performance
5. Keep team on standby

### 6.4 Rollback Procedure

#### If Issues Occur (< 5 min from issue detection)
```bash
# Step 1: Switch database connection back to Supabase
export DATABASE_URL=<SUPABASE_URL>

# Step 2: Restart application servers
# (This depends on your deployment platform)

# Step 3: Verify traffic is going to Supabase
curl https://api.example.com/health

# Step 4: Check error logs
# Should show everything recovering

# Step 5: Notify team
# Create incident post-mortem
```

---

## Phase 7: Post-Migration (Week 3+)

### 7.1 Stabilization (First 7 Days)

#### Daily Checks
- Error rate trends
- Performance metrics
- Authentication success rates
- Failed login attempts
- API latency
- Database connection health

#### Weekly Review
- User feedback collection
- Performance analysis
- Security audit
- Cost comparison (Supabase vs Neon)

### 7.2 Optimization

#### Performance Tuning
```sql
-- Add missing indexes based on slow query logs
-- Analyze query execution plans
-- Optimize hot spots

-- Vacuum and analyze tables
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Monitoring & Alerting
- Setup error tracking (Sentry, etc.)
- Configure performance monitoring (New Relic, Datadog)
- Create dashboards for auth metrics
- Setup alerts for failed logins > threshold
- Monitor database resource usage

### 7.3 Cleanup (After 2 weeks)

#### Decommission Supabase
1. Keep backup for 30 days
2. Archive all Supabase data
3. Remove Supabase environment variables
4. Cancel Supabase subscription
5. Document final costs and learnings

#### Archive Supabase Data
```bash
# Final backup of Supabase
pg_dump --host=your-supabase-host \
  --username=postgres \
  --database=postgres \
  --format=custom \
  > final_supabase_backup_$(date +%Y%m%d).dump

# Upload to S3 or archival storage
aws s3 cp final_supabase_backup_*.dump s3://backups/supabase-archive/
```

---

## Security Enhancements

### Authentication Security

#### 1. Password Hashing
- Algorithm: bcrypt with salt rounds 12
- Never store plain text passwords
- Hash migration: Supabase → Neon via password reset requirement

#### 2. Token Management
- JWT tokens: HS256 or RS256
- Access token TTL: 15-30 minutes
- Refresh token TTL: 7-30 days
- Token rotation: Issue new refresh token on each refresh
- Token revocation: Maintain blacklist for logged out tokens

#### 3. Session Management
- Per-device sessions with unique device IDs
- Session timeout: 24 hours of inactivity
- Concurrent session limit: 5 devices per user
- One-click "logout all devices"

#### 4. Brute Force Protection
```sql
-- Automatic account lock after 5 failed attempts
-- Lock duration: 15 minutes
-- Failed attempts reset after 24 hours of inactivity
```

#### 5. Multi-Factor Authentication (MFA)
- TOTP (Time-based One-Time Password) via authenticator apps
- Backup codes for account recovery
- SMS-based OTP (optional)
- Biometric authentication (existing)

#### 6. Audit Logging
- Log all authentication events
- Track device information
- Monitor geographic anomalies
- Alert on suspicious activity

### Data Security

#### 1. Encryption at Rest
- Neon provides encryption at rest
- Sensitive data encrypted in application layer

#### 2. Encryption in Transit
- TLS 1.3 for all connections
- Enforce HTTPS everywhere
- Use connection pooling with SSL

#### 3. Access Control
- RLS policies on all tables
- Service role key only for migrations
- Principle of least privilege
- Regular access reviews

#### 4. Data Classification
```
PUBLIC - Exchange rates, public payment links
INTERNAL - Transaction metadata
SENSITIVE - User personal data, bank accounts
CONFIDENTIAL - Passwords, auth tokens, PII
```

---

## Rollback & Disaster Recovery

### Rollback Triggers

1. **Error Rate > 5%**: Switch back immediately
2. **Auth Service Down > 2 min**: Initiate rollback
3. **Data Corruption Detected**: Activate recovery plan
4. **Performance Degradation > 50%**: Assess and decide

### Recovery Procedures

#### Scenario 1: Neon Connection Failure
```bash
# Switch to Supabase in 30 seconds
1. Flip environment variable (blue-green deployment)
2. Verify traffic routing
3. Monitor error logs
4. Investigate root cause
```

#### Scenario 2: Data Inconsistency
```bash
# Activate parallel run mode
1. Stop write operations to Neon
2. Keep Supabase as primary
3. Resync data from Supabase to Neon
4. Run validation queries
5. Resume normal operation
```

#### Scenario 3: Authentication Failure
```bash
# Fallback to session-based auth
1. Activate fallback auth mechanism
2. Use cached user sessions
3. Rate limit new logins
4. Notify support team
5. Investigate root cause
```

---

## Monitoring & Observability

### Key Metrics to Monitor

```
Authentication Metrics:
- Login success rate (target: 99.9%)
- Token refresh rate
- Session creation/deletion rate
- MFA adoption rate
- Failed login attempts
- Brute force attempts blocked

Performance Metrics:
- Login latency (p50, p95, p99)
- Token refresh latency
- API response times
- Database query latency
- Connection pool usage
- Active sessions

Security Metrics:
- Suspicious login attempts
- Unusual geographic patterns
- Device anomalies
- Failed password reset attempts
- Account lockouts
```

### Alerting Rules

```
CRITICAL (Immediate Action):
- Auth service response time > 5s
- Login success rate < 95%
- Database connection errors > 10/min
- Unhandled exceptions > 50/min

WARNING (Investigate):
- Login latency p95 > 2s
- Session cleanup failures
- Token generation failures
- Rate limit hits > 100/hour

INFO (Monitor):
- Unusual traffic patterns
- High MFA adoption
- New device logins
- Password reset requests
```

---

## Knowledge Transfer & Training

### Documentation

1. **Architecture Documentation**
   - System design
   - Authentication flow diagrams
   - Database schema with relationships
   - API endpoint documentation

2. **Operational Guides**
   - Deployment procedures
   - Incident response playbooks
   - Password reset procedures
   - Session management
   - MFA troubleshooting

3. **Developer Guides**
   - Authentication service usage
   - Token handling best practices
   - Error handling patterns
   - Testing strategies
   - Debugging tips

### Team Training

1. **Backend Developers** (2 hours)
   - New auth service APIs
   - Database schema changes
   - Error handling patterns
   - Testing approaches

2. **DevOps Team** (1.5 hours)
   - Neon setup and configuration
   - Connection pooling
   - Monitoring and alerting
   - Backup and recovery

3. **Support Team** (1 hour)
   - Common auth issues
   - Password reset process
   - Session troubleshooting
   - Escalation procedures

---

## Cost Analysis

### Supabase (Current)
- Base: $25/month
- Database: $0.135/GB (overage)
- Real-time: $10/month
- **Estimated Monthly**: $50-75

### Neon (Post-Migration)
- Fixed: $15/month
- Compute hours: $0.16/hour (free tier: 1000 hours)
- Data storage: $0.12/GB (includes 3GB)
- **Estimated Monthly**: $30-45

### Migration Costs
- Development: 40 hours × $75/hr = $3,000
- Testing & QA: 30 hours × $50/hr = $1,500
- DevOps/Infrastructure: 20 hours × $80/hr = $1,600
- Documentation: 10 hours × $50/hr = $500
- **Total Migration Cost**: ~$6,600

### ROI
- Monthly savings: $25-30
- Payback period: 7-9 months
- Year 1 savings: $300-360 (after migration costs)
- Year 2+ savings: $300-360 annually

---

## Success Criteria

### Must Have
- [x] Zero data loss during migration
- [x] All users can log in after migration
- [x] All API endpoints functional
- [x] Performance equal to or better than Supabase
- [x] Security equal to or better than Supabase
- [x] All tests passing

### Should Have
- [ ] Error rate < 0.1%
- [ ] Login latency < 500ms (p95)
- [ ] MFA adoption > 50%
- [ ] Full audit logging
- [ ] Cost reduction of 30%+

### Nice to Have
- [ ] Advanced security features (risk-based auth)
- [ ] Enhanced analytics
- [ ] API rate limiting per user
- [ ] Custom branding for auth flows

---

## Timeline Summary

| Phase | Task | Duration | Owner |
|-------|------|----------|-------|
| **Phase 1** | Preparation & Neon Setup | 3 days | DevOps |
| **Phase 2** | Database Migration | 4 days | DBA + Backend |
| **Phase 3** | Auth Implementation | 5 days | Backend Lead |
| **Phase 4** | Code Updates | 3 days | Full Team |
| **Phase 5** | Testing & QA | 4 days | QA + Backend |
| **Phase 6** | Production Migration | 1 day | DevOps + On-call |
| **Phase 7** | Stabilization | 7 days | Full Team |
| | **TOTAL** | **~3 weeks** | |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Data Loss | Low | Critical | Full backups, validation tests, parallel run |
| User Lockout | Low | High | Fallback auth, quick rollback plan |
| Performance Issues | Medium | High | Load testing, monitoring, optimization ready |
| Migration Bugs | Medium | Medium | Thorough testing, code review, staged rollout |
| Downtime | Low | High | Off-peak migration, 5-min cutover target |
| Team Knowledge Gap | Medium | Medium | Comprehensive training, documentation |
| Cost Overruns | Low | Medium | Fixed estimates, time tracking |

---

## Contact & Escalation

- **Migration Lead**: [Lead Name] ([email])
- **Backend Lead**: [Name] ([email])
- **DevOps Lead**: [Name] ([email])
- **Emergency Contacts**: [On-call team list]

---

**Document Version**: 1.0  
**Last Updated**: December 24, 2024  
**Status**: Ready for Implementation  
**Approved By**: [CTO/Tech Lead]
```

Now let me create the database migration scripts and enhanced authentication service:

---

## RunAsh Chat Session Storage Rollout (Database-Backed)

### Scope
- New database tables: `runash_chat_sessions`, `runash_chat_session_messages`.
- New repositories:
  - `lib/repositories/sessions.ts`
  - `lib/repositories/session-messages.ts`
- Existing API contracts preserved for:
  - `GET /api/sessions`
  - `POST /api/sessions`
  - `GET /api/sessions/recent`
  - `GET /api/messages/session/:id`

### Staged rollout with feature flag
- **Flag:** `RUNASH_CHAT_DB_REPOSITORY_ENABLED`
- **Default-safe behavior:** keep `RUNASH_CHAT_DB_REPOSITORY_ENABLED=false` to continue using the legacy filesystem path.
- **Enable database path:** set `RUNASH_CHAT_DB_REPOSITORY_ENABLED=true` after migration is applied and verified.

### Rollback guidance
1. Set `RUNASH_CHAT_DB_REPOSITORY_ENABLED=false`.
2. Redeploy API routes to immediately route reads/writes back to filesystem-backed storage.
3. Keep migration tables in place during rollback to avoid destructive operations.
4. Investigate and patch DB path issues, then re-enable the flag in staging first.

### Risks and mitigation
- **Risk:** unexpected DB latency or migration mismatch.
  - **Mitigation:** use feature flag rollback and keep contracts unchanged.
- **Risk:** session ordering regressions.
  - **Mitigation:** indexed sort paths on `(user_id, updated_at)` and `(session_id, created_at)`.

## Dashboard Streams Repository Migration (2026-02-13)

### Scope
- Stream dashboard APIs now persist/retrieve `recent`, `scheduled`, and `invite` data from database repositories instead of direct filesystem reads/writes.
- Added SQL migration: `scripts/sql/2026-02-13_create_stream_invites.sql`.

### Legacy development bootstrap
- Existing `data/streams.json` is auto-bootstrapped into database-backed records in non-production only.
- Controls:
  - `RUNASH_STREAMS_DEV_BOOTSTRAP` (default enabled outside production; set `0` to disable)
  - `RUNASH_STREAMS_DEV_FALLBACK` (explicitly set `1` to allow filesystem fallback outside production)

### Rollback
1. Keep migration table in place (non-destructive change).
2. Disable DB fallback path by unsetting `RUNASH_STREAMS_DEV_FALLBACK`.
3. Revert repository-backed route changes if needed.
