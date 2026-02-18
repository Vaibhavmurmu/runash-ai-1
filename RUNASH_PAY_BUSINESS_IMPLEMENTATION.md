# RunAsh Pay - Business & Startup Implementation Plan

## 2026-02 Auth Transition Dependency Note

- Payment and business APIs continue to rely on stable auth identity/session contracts during the Better Auth single-runtime migration.
- Existing payment endpoint field names and API signatures remain unchanged in this phase.
- Production cutover must be gated on auth compatibility checks for existing users/cookies/tokens and a tested rollback plan documented in `RUNASH-AUTH.md`.


### Auth feature-flag rollout and payment safety gates (2026-02)

- Better Auth rollout for payment-adjacent traffic uses staged percentages (`10% -> 50% -> 100%`) behind `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT`.
- Promotion between stages requires stable auth/security metrics: `auth_error_rate`, `session_invalidation_rate`, `admin_403_anomaly_rate`, and `payment_auth_incident_count`.
- Rollback trigger conditions include sustained auth failures (>2x baseline), privileged access anomalies, or any payment-flow authorization incident.
- Rollback action is immediate hard-disable (`FEATURE_FLAG_USE_BETTER_AUTH=false`) with verification of legacy session fallback and payment access checks before resuming rollout.

### Payment/Auth policy alignment additions

- Account-linking posture for payment operators follows verified-identity requirements (deny-by-default for unsafe linking paths).
- Session policy for payment operations is fail-closed and must be server-session derived.
- RBAC model for finance/admin/operator responsibilities must include organization scope validation for customer-facing payment surfaces.
- Incident handling for auth anomalies that may affect payment authorization must include rapid session revocation, key rotation, and documented rollback actions.

### 2026-02 auth hardening compatibility update

- Verified OAuth linking, sensitive-session invalidation, and stricter auth/admin throttling remain backward-compatible with existing payment API contracts.
- No payment payload, field-name, or route signature changes are introduced by this hardening update.

## Auth/RBAC architecture sync (implemented vs planned)

### Implemented
- Payment/business flows now reference the finalized Better Auth server-session architecture (`middleware.ts` -> `/api/auth/get-session` -> shared session accessors) described in `RUNASH-AUTH.md`.
- Canonical RBAC tiers (`viewer`, `operator`, `admin`) and legacy-role compatibility mapping are the active authorization contract for payment-adjacent admin/business surfaces.
- No payment API request/response field names, signatures, or webhook schemas changed in this documentation sync.

### Planned
- Continue staged fallback retirement for legacy NextAuth compatibility reads after stability criteria are met.
- If future payment contract changes are required, ship them as explicitly versioned migrations with rollout communication.

## Executive Summary

This comprehensive guide outlines the strategy for deploying RunAsh Pay across Business and Startup segments. The implementation focuses on secure payment processing, seamless integrations, enterprise scalability, and compliance requirements specific to each user segment.

---

## Table of Contents

1. [Vision & Market Positioning](#vision--market-positioning)
2. [Segment-Specific Requirements](#segment-specific-requirements)
3. [Feature Matrix](#feature-matrix)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Compliance & Security Framework](#compliance--security-framework)
7. [Infrastructure & Scalability](#infrastructure--scalability)
8. [Deployment Strategy](#deployment-strategy)

---

## Vision & Market Positioning

### RunAsh Pay Mission
Enable businesses and startups to accept, process, and manage payments seamlessly through a secure, scalable, and user-friendly UPI-first platform.

### Market Positioning
- **For Startups**: Cost-effective, quick-to-integrate payment solution with minimal overhead
- **For Businesses**: Enterprise-grade payment infrastructure with advanced analytics and compliance tools
- **For All**: AI-powered insights, multi-currency support, and industry-leading security

### Success Metrics
- 99.9% uptime and transaction success rate
- <2 second payment processing time
- <1% transaction failure rate
- <100ms API response time
- 100% PCI-DSS compliance

---

## Segment-Specific Requirements

### STARTUP REQUIREMENTS

#### User Profile
- Small teams (1-50 employees)
- Limited technical resources
- Cost-conscious
- Fast time-to-market

#### Key Needs
1. **Easy Setup**: Plug-and-play integration
2. **Cost Efficiency**: Low transaction fees (< 1%)
3. **Growth Scaling**: Auto-scaling infrastructure
4. **Basic Analytics**: Transaction summaries, daily reports
5. **Multi-Payment Options**: UPI, Cards, Wallets
6. **Simple Dashboard**: Essential metrics only
7. **Support**: Chat-based, community forum
8. **Payment Links**: No code payment solution

#### Feature Priorities
- Payment links and QR codes
- Basic transaction reports
- Webhook integrations
- Email receipts
- Mobile-first design

#### Technical Requirements
- REST API (simplified)
- Webhook support
- SDK in JavaScript/Python
- Rate limiting: 1000 req/min
- Max payload: 5MB
- Response timeout: 30 seconds

---

### BUSINESS REQUIREMENTS

#### User Profile
- Large teams (50+ employees)
- Dedicated technical team
- Revenue optimization focus
- Compliance-heavy

#### Key Needs
1. **Enterprise Security**: Multi-factor authentication, encryption
2. **Advanced Analytics**: Real-time dashboards, predictive insights
3. **Compliance Tools**: Audit logs, regulatory reporting, KYC/AML
4. **High Volume**: 10,000+ transactions/day
5. **Custom Integration**: API-first approach
6. **Settlement Options**: Next-day, same-day, real-time settlement
7. **Dedicated Support**: 24/7 account management
8. **White-label Options**: Custom branding

#### Feature Priorities
- Advanced reconciliation tools
- Batch processing
- Custom workflows
- API rate limits: 100,000 req/min
- Real-time settlements
- Advanced fraud detection
- Detailed audit trails
- Custom reporting

#### Technical Requirements
- GraphQL API (in addition to REST)
- WebSocket support for real-time updates
- Enterprise SDK in multiple languages
- Max payload: 50MB
- Response timeout: 60 seconds
- Database replication: Multi-region
- Load balancing: Geographic

---

## Feature Matrix

### Core Payment Features

| Feature | Startup | Business | Notes |
|---------|---------|----------|-------|
| UPI Payments | ✅ | ✅ | Native support |
| QR Code Generation | ✅ | ✅ | Dynamic QR codes |
| Payment Links | ✅ | ✅ | Customizable links |
| Invoice Generation | ✅ | ✅ | PDF export |
| Recurring Payments | ❌ | ✅ | Subscription support |
| Payment Plans | ❌ | ✅ | Flexible payment terms |
| Refunds | ✅ | ✅ | Instant or scheduled |
| Partial Refunds | ❌ | ✅ | Pro-rata refunds |
| International Transfers | ❌ | ✅ | Multi-currency |
| Card Payments | Basic | Advanced | Tokenization, 3DS |
| Wallet Integration | ✅ | ✅ | All major wallets |
| BNPL Options | ❌ | ✅ | Partner integrations |

### Analytics & Reporting

| Feature | Startup | Business | Notes |
|---------|---------|----------|-------|
| Transaction Reports | ✅ | ✅ | Basic daily/monthly |
| Real-time Dashboard | Basic | Advanced | Live updates |
| Custom Reports | ❌ | ✅ | Dynamic queries |
| Fraud Detection | Basic | Advanced | ML-powered |
| Settlement Reports | ✅ | ✅ | Detailed breakdowns |
| Tax Reports | ❌ | ✅ | GST, TDS compliance |
| Export Formats | CSV | CSV/Excel/PDF/API | Multiple formats |
| Data Retention | 6 months | Unlimited | Legal requirement |

### User Management

| Feature | Startup | Business | Notes |
|---------|---------|----------|-------|
| Basic User Accounts | ✅ | ✅ | Email verification |
| Multi-user Accounts | ❌ | ✅ | Team collaboration |
| Role-based Access | ❌ | ✅ | Granular permissions |
| Activity Logging | ✅ | ✅ | All user actions |
| Two-factor Authentication | ✅ | ✅ | TOTP, SMS, Email |
| Single Sign-On | ❌ | ✅ | SAML, OAuth |
| API Keys | ✅ | ✅ | Secure authentication |
| Audit Trails | Basic | Advanced | Immutable logs |

### Integration Options

| Feature | Startup | Business | Notes |
|---------|---------|----------|-------|
| REST API | ✅ | ✅ | Standard endpoints |
| Webhooks | ✅ | ✅ | Event-driven |
| Plugins | Limited | Extensive | E-commerce platforms |
| SDK (JS/Python) | ✅ | ✅ | Native libraries |
| GraphQL API | ❌ | ✅ | Query flexibility |
| Zapier Integration | ✅ | ✅ | No-code automation |
| Custom Integrations | Basic Support | Dedicated Support | API consulting |

### Compliance & Security

| Feature | Startup | Business | Notes |
|---------|---------|----------|-------|
| PCI-DSS Compliance | ✅ | ✅ | Level 1 certified |
| Data Encryption | ✅ | ✅ | AES-256 |
| KYC/AML Tools | ❌ | ✅ | Regulatory compliance |
| Fraud Prevention | Basic | Advanced | Real-time detection |
| DDoS Protection | ✅ | ✅ | Always-on |
| SSL/TLS | ✅ | ✅ | TLS 1.2+ |
| Regular Audits | ✅ | ✅ | SOC 2 Type II |
| Data Localization | ❌ | ✅ | Regional storage options |

---

## Technical Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                           │
│  (Rate Limiting, Authentication, Load Balancing)            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼──┐    ┌────▼─┐    ┌───▼──┐
    │REST  │    │Graph │    │WebSocket
    │API   │    │QL    │    │Server
    └───┬──┘    └────┬─┘    └───┬──┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │   Business Logic Layer  │
        │ - Payment Processing    │
        │ - User Management       │
        │ - Reporting Engine      │
        └────────────┬────────────┘
                     │
        ┌────────────▼─────────────┐
        │    Data Layer (Neon)     │
        │ - Primary Database       │
        │ - Read Replicas          │
        │ - Cache Layer (Redis)    │
        └──────────────────────────┘
        
        ┌────────────────────────┐
        │  External Services     │
        │ - UPI Gateway          │
        │ - SMS Provider         │
        │ - Email Service        │
        │ - Fraud Detection      │
        │ - KYC Provider         │
        └────────────────────────┘
```

### Database Schema (Multi-Tenant)

```sql
-- Core Tables

-- Organizations (Tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('startup', 'business') NOT NULL,
  tier ENUM('free', 'pro', 'enterprise') NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  KEY (type, tier)
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role ENUM('admin', 'manager', 'operator', 'viewer') DEFAULT 'operator',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  KEY (org_id, status),
  KEY (email)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  type ENUM('payment', 'refund', 'payout', 'adjustment') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status ENUM('pending', 'success', 'failed', 'cancelled') DEFAULT 'pending',
  payment_method ENUM('upi', 'card', 'wallet', 'bank_transfer') NOT NULL,
  reference_id VARCHAR(100),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  KEY (org_id, created_at),
  KEY (org_id, status),
  KEY (reference_id)
);

-- Payments (Detailed)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id),
  org_id UUID REFERENCES organizations(id),
  payer_upi VARCHAR(255),
  payee_upi VARCHAR(255),
  upi_transaction_id VARCHAR(100) UNIQUE,
  gateway_response JSONB,
  retry_count INT DEFAULT 0,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  KEY (org_id, created_at),
  KEY (upi_transaction_id)
);

-- Settlements
CREATE TABLE settlements (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  transaction_count INT,
  fees DECIMAL(15,2),
  status ENUM('pending', 'processing', 'completed', 'failed'),
  bank_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  KEY (org_id, status, period_end)
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  name VARCHAR(255),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  secret_hash VARCHAR(255) NOT NULL,
  permissions JSONB,
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  KEY (org_id, is_active)
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  url TEXT NOT NULL,
  events JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  retry_policy JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  KEY (org_id, is_active)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  KEY (org_id, created_at),
  KEY (user_id, created_at)
);

-- Create Indexes for Performance
CREATE INDEX idx_transactions_org_date ON transactions(org_id, created_at DESC);
CREATE INDEX idx_payments_org_date ON payments(org_id, created_at DESC);
CREATE INDEX idx_settlements_org_status ON settlements(org_id, status);
CREATE INDEX idx_audit_logs_org_date ON audit_logs(org_id, created_at DESC);
```

### API Endpoint Specifications

#### Authentication Endpoints

```
POST /api/v1/auth/register
  - Create new organization account
  - Startup/Business selection
  
POST /api/v1/auth/login
  - Email/password authentication
  - 2FA verification
  
POST /api/v1/auth/mfa/verify
  - TOTP verification
  - Backup code validation

POST /api/v1/auth/refresh
  - Token refresh
  - Session extension
```

#### Payment Processing

```
POST /api/v1/payments/create
  - Initiate UPI payment
  - Returns: payment ID, QR code, status
  
POST /api/v1/payments/:id/confirm
  - Confirm payment after user authorization
  
GET /api/v1/payments/:id
  - Fetch payment details
  
POST /api/v1/payments/:id/refund
  - Process refund (full or partial)

POST /api/v1/payment-links
  - Create shareable payment link
  
GET /api/v1/payment-links/:id
  - Fetch link details and analytics
```

#### Settlement & Reporting

```
GET /api/v1/settlements
  - List settlements with filters
  
GET /api/v1/reports/transactions
  - Fetch transaction reports
  - Supports: CSV, PDF, JSON exports
  
GET /api/v1/reports/analytics
  - Real-time analytics dashboard data
  
GET /api/v1/reconciliation
  - Auto-reconciliation status
```

#### User & Organization Management

```
GET /api/v1/organization/profile
  - Fetch org details
  
PATCH /api/v1/organization/profile
  - Update org settings
  
POST /api/v1/organization/users
  - Add team member
  
PATCH /api/v1/organization/users/:id/role
  - Update user permissions
  
GET /api/v1/organization/audit-logs
  - Fetch audit trail
```

#### Webhook Management

```
POST /api/v1/webhooks
  - Register webhook endpoint
  
GET /api/v1/webhooks
  - List registered webhooks
  
DELETE /api/v1/webhooks/:id
  - Unregister webhook
  
POST /api/v1/webhooks/:id/test
  - Send test event
```

### Rate Limiting Strategy

**Startup Tier**
- 1,000 requests/minute
- 100,000 requests/day
- Burst capacity: 5,000/minute

**Business Tier**
- 100,000 requests/minute
- 10,000,000 requests/day
- Burst capacity: 500,000/minute

**Rate Limit Headers**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640000000
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Objectives**
- Multi-tenant database setup
- Core API infrastructure
- Basic authentication

**Deliverables**
- Neon database with multi-tenant schema
- API Gateway with rate limiting
- User registration and login
- API key management
- Basic transaction logging

**Resources**
- Backend: 2 engineers
- DevOps: 1 engineer
- QA: 1 engineer

### Phase 2: Core Features (Weeks 5-8)

**Objectives**
- Payment processing
- Settlement management
- Basic reporting

**Deliverables**
- UPI payment integration
- Payment link creation
- QR code generation
- Settlement processing
- Transaction reports
- Webhook support

**Resources**
- Backend: 3 engineers
- Frontend: 1 engineer
- QA: 1 engineer

### Phase 3: Advanced Features (Weeks 9-12)

**Objectives**
- Analytics and insights
- Compliance tools
- White-label support

**Deliverables**
- Real-time analytics dashboard
- Fraud detection ML model
- KYC/AML integration
- Custom reporting engine
- Audit trail system
- White-label UI customization

**Resources**
- Backend: 3 engineers
- Frontend: 2 engineers
- ML Engineer: 1
- QA: 2 engineers

### Phase 4: Enterprise Features (Weeks 13-16)

**Objectives**
- High-volume handling
- Enterprise security
- Multi-region support

**Deliverables**
- Batch processing engine
- Advanced reconciliation
- GraphQL API
- SSO integration (SAML/OAuth)
- Data replication (multi-region)
- Enterprise audit logging

**Resources**
- Backend: 4 engineers
- DevOps: 2 engineers
- Security: 1 engineer
- QA: 2 engineers

### Phase 5: Testing & Optimization (Weeks 17-20)

**Objectives**
- Performance optimization
- Security hardening
- Load testing

**Deliverables**
- Performance tuning (< 2s latency)
- Security audit completion
- Load testing at 100K TPS
- Compliance certification
- Documentation

**Resources**
- QA: 3 engineers
- DevOps: 2 engineers
- Security: 1 engineer

### Phase 6: Launch (Week 21)

**Objectives**
- Production deployment
- Customer onboarding
- Support setup

**Deliverables**
- Production environment
- Customer onboarding portal
- Support ticketing system
- Documentation
- Training materials

---

## Auth Gateway Dependency Note (2026-02)

Payment and business APIs continue to rely on upstream authenticated session context. Middleware now verifies Better Auth session validity before allowing requests into protected routes, reducing forged-cookie bypass risk for downstream billing and analytics handlers. This change is backward compatible and does not alter payment API contracts or payload schemas.

## Compliance & Security Framework

### Regulatory Compliance

#### India-Specific (Primary Market)

1. **RBI Guidelines**
   - NPCI regulations for UPI payments
   - Payment system regulations
   - KYC/AML requirements (PML Rules 2020)

2. **Data Protection**
   - Personal Data Protection Bill (DPDP)
   - Right to privacy
   - Data residency in India

3. **Financial Compliance**
   - GST compliance for fintech services
   - TDS applicability on payments
   - Statutory reporting requirements

#### International Compliance (For Expansion)

1. **GDPR** (EU expansion)
   - Data processing agreements
   - Privacy by design
   - Data subject rights

2. **KYC/AML**
   - FinCEN requirements (US)
   - Transaction monitoring
   - Suspicious activity reporting

### Security Standards

#### Data Security

```
Encryption Requirements:
- Data at rest: AES-256
- Data in transit: TLS 1.2+
- Database encryption: Transparent Data Encryption (TDE)
- Field-level encryption for PII

Authentication:
- Passwords: PBKDF2 with 100k iterations
- API Keys: HMAC-SHA256
- Tokens: JWT with RS256 signing
- 2FA: TOTP (HMAC-SHA1) or SMS-based

Key Management:
- Secrets stored in Vercel KV
- Key rotation every 90 days
- Separate keys for each environment
- Hardware security module (HSM) for production
```

#### PCI-DSS Compliance (Level 1)

**Required Measures**
- Network segmentation with firewall
- Intrusion detection system (IDS)
- Regular security testing & penetration tests
- Annual PCI-DSS audit
- Secure data deletion procedures
- Incident response plan

**Payment Card Data Handling**
- Never store full card numbers
- Tokenization for card payments
- PCI-certified payment gateway
- Secure SSL/TLS for all transactions

#### DDoS & Infrastructure Security

```
Protection Layers:
1. Cloudflare Enterprise (DDoS protection)
2. WAF (Web Application Firewall)
   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Rate limiting per IP
3. Bot detection and mitigation
4. Geographic IP filtering
5. Behavioral analysis
```

### Compliance Checklist

**For All Organizations**

- [ ] User consent management (DPDP Act)
- [ ] Data breach notification procedure
- [ ] Privacy policy and terms of service
- [ ] Regular security audits (quarterly)
- [ ] Incident response playbook
- [ ] Employee training on data security
- [ ] Data retention policies
- [ ] Secure password policy
- [ ] MFA enforcement
- [ ] Activity logging and monitoring

**Additional for Business Tier**

- [ ] KYC verification (Government ID)
- [ ] Business registration verification
- [ ] Director identification
- [ ] Beneficial ownership disclosure
- [ ] Ongoing transaction monitoring
- [ ] Suspicious activity reporting
- [ ] Sanctions list screening
- [ ] PEP (Politically Exposed Persons) screening
- [ ] Transaction velocity checks
- [ ] Behavior analysis and anomaly detection

---

## Infrastructure & Scalability

### Infrastructure Architecture

#### Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                     │
│  Distributes static assets globally, DDoS protection    │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼──────┐   ┌────▼──────┐   ┌────▼──────┐
│  Edge    │   │  Edge     │   │  Edge     │
│ Server   │   │  Server   │   │  Server   │
│ (US)     │   │  (EU)     │   │  (Asia)   │
└───┬──────┘   └────┬──────┘   └────┬──────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
         ┌───────────▼──────────┐
         │  API Gateway         │
         │  (Load Balancer)     │
         └───────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼──┐    ┌────▼─┐    ┌───▼──┐
    │App   │    │App   │    │App   │
    │Pod 1 │    │Pod 2 │    │Pod N │
    │      │    │      │    │      │
    └───┬──┘    └────┬─┘    └───┬──┘
        │            │            │
        └────────────┼────────────┘
                     │
         ┌───────────▼──────────┐
         │ Neon Database        │
         │ (Multi-region)       │
         │ Primary + Replicas   │
         └──────────────────────┘
```

#### Database Replication

```
Primary Database (India - Mumbai)
    ↓ Logical Replication
Read Replica 1 (India - Delhi)
Read Replica 2 (US - Virginia)
Read Replica 3 (EU - Frankfurt)

Backup Strategy:
- Continuous WAL archiving
- Daily full backups
- Weekly incremental backups
- RPO: 1 hour
- RTO: 15 minutes
```

### Scalability Configuration

#### Neon Database Autoscaling

```
Compute Configuration:
Startup Tier:
- Min: 0.5 vCPU
- Max: 2 vCPU
- Auto-pause: After 5 minutes of inactivity
- Connection pool: 100 concurrent

Business Tier:
- Min: 2 vCPU
- Max: 32 vCPU
- No auto-pause
- Connection pool: 1000 concurrent

Storage:
- Auto-grow: Up to 1TB
- Retention: 7 days (Startup), 30 days (Business)
```

#### Vercel Deployment

```
Edge Functions:
- Automatic scaling to handle traffic spikes
- Global distribution (150+ edge locations)
- Cold start: <100ms

Serverless Functions (API Routes):
- Auto-scale from 0 to 1000+ concurrent requests
- Region: India (Primary), US (Fallback)
- Memory: 3GB per function
- Timeout: 30s (Startup), 60s (Business)
```

### Monitoring & Observability

#### Metrics Collection

```
Application Metrics:
- Request latency (p50, p95, p99)
- Error rate and error types
- Throughput (requests/sec)
- Transaction success rate
- Database query performance
- API endpoint performance

Business Metrics:
- Transaction volume
- Revenue processed
- Settlement cycles
- Customer retention
- Churn rate

Infrastructure Metrics:
- CPU utilization
- Memory usage
- Disk I/O
- Network bandwidth
- Connection pool utilization
```

#### Alerting Strategy

```
Critical Alerts (Immediate):
- Error rate > 1%
- API latency p99 > 5s
- Database connection exhaustion
- Payment processing failure
- Security breach detection
- Data loss event

Warning Alerts (Urgent):
- Error rate > 0.1%
- API latency p99 > 2s
- Transaction success rate < 99%
- Settlement delay > 1 hour
- Suspicious activity detected
```

---

## Deployment Strategy

### Pre-Launch Checklist

**Technical**
- [ ] All APIs tested with >1M requests
- [ ] Database replication verified across regions
- [ ] Backup and recovery tested
- [ ] Load testing completed (100K+ TPS)
- [ ] Security penetration testing done
- [ ] PCI-DSS compliance verified
- [ ] Disaster recovery drills completed

**Business**
- [ ] Pricing tiers finalized
- [ ] Terms of Service and Privacy Policy reviewed
- [ ] SLA defined and documented
- [ ] Support team trained
- [ ] Customer onboarding process ready
- [ ] Beta users identified
- [ ] Marketing materials prepared

**Compliance**
- [ ] Legal review completed
- [ ] KYC/AML procedures implemented
- [ ] Data processing agreements signed
- [ ] Regulatory approvals obtained
- [ ] Audit logging configured
- [ ] Incident response plan tested

### Launch Phases

#### Phase 1: Closed Beta (Week 1-2)
- 50-100 hand-picked startups
- Real transactions with monitoring
- Daily feedback calls
- Bug fixes and optimization
- Load testing at 100 TPS

#### Phase 2: Open Beta (Week 3-4)
- 1,000 early-access users
- Public API documentation
- Community forum launch
- Tier-based pricing trials
- Load testing at 1,000 TPS

#### Phase 3: General Availability (Week 5)
- Full public launch
- All features enabled
- Premium support available
- Compliance certifications published
- Load testing at 10,000+ TPS

#### Phase 4: Post-Launch (Week 6+)
- Continuous monitoring
- Feature releases every 2 weeks
- Customer feedback integration
- Performance optimization
- Market expansion planning

### Rollout Strategy

```
Day 1 (Monday):
- Deploy to production
- Startup tier: 100% traffic
- Business tier: 50% traffic
- Dedicated monitoring team on call

Day 2-3:
- Business tier: 100% traffic
- Performance analysis
- Bug fixes for critical issues
- Customer support ramping

Day 4-7:
- Full production traffic
- Market expansion to other regions
- Feature announcement
- Sales team enablement

Week 2+:
- Optimize based on metrics
- Plan next feature release
- Expand to international markets
- Enterprise sales outreach
```

### Monitoring During Launch

```
Critical Metrics to Watch:
1. API Response Time
   - Target: <2 seconds (p95)
   - Alert: >3 seconds

2. Error Rate
   - Target: <0.1%
   - Alert: >0.5%

3. Transaction Success Rate
   - Target: >99%
   - Alert: <98%

4. Database Performance
   - Query latency p99: <500ms
   - Connection pool utilization: <80%

5. Customer Experience
   - Payment completion rate
   - Customer support response time
   - Bug report frequency

Incident Response:
- On-call team: 24/7
- Response time: <5 minutes
- Communication: Every 5 minutes
- Escalation path: Engineering → Director → CTO
```

---

## Success Metrics & KPIs

### Technical KPIs

| Metric | Target | Startup | Business |
|--------|--------|---------|----------|
| API Uptime | 99.9% | 99.9% | 99.99% |
| P50 Latency | <500ms | <300ms | <200ms |
| P95 Latency | <2s | <1s | <500ms |
| Error Rate | <0.1% | <0.05% | <0.01% |
| Success Rate | >99% | >99.5% | >99.9% |
| Database Availability | 99.99% | 99.99% | 99.99% |

### Business KPIs (Year 1)

| Metric | Target |
|--------|--------|
| User Signups | 50,000 |
| Transaction Volume | 10M transactions |
| GMV (Gross Merchandise Value) | $50M |
| Revenue | $500K |
| Customer Retention | 80% |
| NPS Score | >50 |
| Market Expansion | 3 new countries |

---

## Conclusion

This comprehensive plan provides RunAsh Pay with a roadmap to establish itself as a leading payment platform for startups and businesses in India and beyond. Success requires meticulous execution across all dimensions: technology, compliance, security, and customer experience.

**Next Steps:**
1. Approve the implementation plan
2. Allocate resources per phase
3. Set up project management system
4. Begin Phase 1 development
5. Establish vendor partnerships for payments, SMS, email

**Timeline to Market:** 5 months (20 weeks)

**Estimated Development Cost:** $200K - $400K
- Engineering: $120K - $200K
- Infrastructure: $30K - $50K
- Compliance/Legal: $20K - $50K
- Testing/QA: $20K - $40K
- Security/Audits: $10K - $60K

## Compatibility & Migration Notes (Envelope Standard)

To improve payment auditability and reduce per-endpoint variance, payment-facing API responses are converging on a common envelope contract:

- `success`
- `data`
- `error`
- `requestId`
- optional `meta`

### Current policy
- `/api/v1/*` is the preferred stabilized namespace for external clients.
- Existing non-versioned endpoints remain active for backward compatibility.
- Legacy response fields may be emitted in parallel during transition to reduce integration risk.

### Risk and rollback
- **Risk:** consumers tightly coupled to old root-level response keys may fail if they assume exclusive shape.
- **Mitigation:** dual-field compatibility during migration + phased client rollout.
- **Rollback:** route callers back to non-versioned endpoints and keep legacy parsing paths enabled until parity checks pass.

## Agentic payment-flow guardrails

For agent-assisted workflows:
- Payment-impacting actions are not auto-executed.
- Actions enter an auditable approval path in `/api/agents/actions`.
- Rollback path: disable `RUNASH_AGENT_CHAT_ENABLED` to immediately stop new agent actions while preserving existing payment APIs.


## UI Safeguard Update (Settings High-Risk Actions)

Business and Startup plan-management surfaces now require explicit confirmation before cancellation or downgrade requests execute. This improves auditability and reduces accidental billing mutations while preserving existing API contracts.

## Frontend Route Mapping (Implemented)

The feature matrix is now represented by concrete App Router pages:

| Segment / Flow | Route | Notes |
|---|---|---|
| RunAsh Pay primary shell | `/payment/runash-pay` | Unified entry for startup + business flows |
| Startup payment surface | `/payment/startup` | Core startup actions aligned to baseline feature set |
| Business payment surface | `/payment/business` | Advanced business actions and onboarding pathway |
| Payment links + methods | `/ecommerce/payments` | Link creation and connected methods |
| Payment intent creation | `/payment/runash-pay#create-intent` | Uses `/api/v1/payment/create-intent` |
| Transactions and analytics | `/payment/dashboard#analytics` | Real-time/basic reporting entry and analytics anchor |
| Subscription management | `/payment/subscription` | Recurring billing and plan management |

### Journey alignment to Feature Matrix

- **Startup journey:** `/payment/startup` → create payment link (`/ecommerce/payments`) → collect payment (`/payment/runash-pay#create-intent`) → view analytics (`/payment/dashboard#analytics`).
- **Business journey:** `/payment/business` → create link/collect payment → manage payout/subscription (`/payment/subscription`) → view analytics (`/payment/dashboard#analytics`) → onboarding support (`/contact-team`).

### Navigation updates

- `/payment/dashboard` includes direct links to `/payment/runash-pay`, `/payment/startup`, `/payment/business`, `/ecommerce/payments`, and `/payment/subscription`.
- `/ecommerce/payments` includes direct links to `/payment/runash-pay`, `/payment/startup`, `/payment/business`, `/payment/subscription`, and `/payment/dashboard#analytics`.

### Risks and rollback

- **Risk level:** low (route and navigation additions only; no payment contract changes).
- **Rollback:** revert new payment route pages and link additions in dashboard/ecommerce surfaces; legacy routes continue to function.

---

## Implementation Update: Auditable Intent + Transaction Persistence

To improve payment reliability for startup and business segments, backend payment execution now uses persistent repositories and idempotent operations.

### Backend updates
- Introduced DB-backed repositories for:
  - payment intents,
  - payment transactions,
  - refunds,
  - payment links.
- Added provider gateway boundary for payment providers (Stripe/Razorpay-compatible adapters).
- Stored provider identifiers and provider event records for each intent/transaction lifecycle.
- Enforced idempotency uniqueness for create/confirm via unique key constraints.
- Added deterministic route-level idempotency key derivation (user/org scoped) when clients do not send explicit idempotency headers/fields.


### Risk and rollback
- **Risk level:** Medium (new persistence tables + provider-driven status transitions).
- **Backward compatibility:** Existing API response fields and route shapes preserved.
- **Rollback plan:** Route traffic can be reverted to legacy in-memory processing by restoring previous `lib/payment-service.ts` implementation while leaving new tables unused.

## API Reliability Update: Billing Lifecycle Coverage

The billing stack now includes end-to-end route coverage for plans, subscription cancellation/reactivation, and invoice retrieval to support production-grade business reconciliation.

### Added billing endpoints

- `GET /api/billing/plans`
- `GET /api/billing/plans/:id`
- `GET /api/billing/invoices`
- `GET /api/billing/invoices/:id`
- `GET /api/billing/invoices/:id/download`
- `POST /api/billing/subscription/cancel`
- `POST /api/billing/subscription/reactivate`

### Stable alias contract

For versioned integrations, equivalent aliases are available under `/api/v1/billing/*` to reduce client migration risk across future internal refactors.

### Rollback plan

If any billing behavior regression is detected, rollback can be performed by restoring previous route handlers while keeping `/api/v1` aliases mapped to known-good implementations.

## Session and authorization hardening (implementation note)

To improve payment reliability and compliance posture for both startup and business flows:
- Billing/payment interactive routes now require authenticated server sessions.
- Route authorization now validates user/org ownership boundaries.
- Business-vs-startup operator actions are gated by scoped RBAC checks.
- Privileged actions are audit logged with sensitive-field sanitization.

### Risk and rollback
- **Risk:** low to medium (access control tightening can surface previously hidden unauthorized usage patterns).
- **Rollback:** revert route-level authz helper adoption while preserving payment contract payloads and endpoint paths.

## Security hardening update (2026-02)
- Standardized server-side route guards for billing/payment routes to use authenticated session identity and scoped RBAC checks.
- Added ownership-aware persistence rules for payment links and payment methods to prevent cross-tenant data access.
- Mock auth pathways are no longer used in production runtime paths (test-only).



## Reliability campaign note: payment/auth logging hardening

### Impacted flows
- Subscription read/create/update
- Subscription cancel/reactivate
- Invoice list/detail/download
- Admin auth analytics/event endpoints

### Behavior changes
- Added correlation ID propagation in headers and payload metadata for billing/auth observability.
- Replaced raw error logging with structured log events and centralized redaction safeguards.
- Removed direct logging of sensitive identifiers (email/token/provider payload internals/payment method identifiers).

### Risk and rollback
- Risk: low (additive response metadata and logging-path changes only).
- Rollback: revert route-level response/requestId header additions and route logger wiring; payment business logic remains unchanged.



## Usage ingestion and reconciliation hardening (2026-02)

### Impacted payment/business flows
- AI usage metering ingestion for billable token/time events.
- Usage reconciliation and delayed event catch-up processing.

### Implementation updates
- Added authenticated single-event ingestion and batch ingestion under `/api/v1/billing/usage`.
- Added durable event storage (`usage_events`) with `event_id` idempotency, resolver attribution (`resolver_id`, `resolver_type`), and extensible metadata (`JSONB`).
- Added rollup storage (`usage_aggregates`) for daily/monthly customer/subscription usage accounting.
- Added delayed ingestion queue/reconciliation processing for retry-safe eventual consistency.
- Added pricing calculator coverage for token-based, execution-time, and hybrid charging models.

### Risk and rollback
- Risk: medium (new billing ingestion persistence path and aggregation writes).
- Rollback: route handlers can be reverted to legacy increment-only behavior; new tables are additive and can be left in place without impacting existing reads.
- Backward compatibility: legacy `metric` + `amount` usage updates remain supported.

## API Contract Standardization (v1)

For payment-operational reliability and auditability:
- Standard envelope is enforced for v1 payment/billing endpoints: `success`, `data`, `error`, `requestId`, optional `meta`.
- Canonical endpoints:
  - `/api/v1/payment/create-intent`
  - `/api/v1/payment/confirm`
  - `/api/v1/payment/methods`
  - `/api/v1/billing/subscription`
  - `/api/v1/billing/checkout`
  - `/api/v1/billing/portal`
  - `/api/v1/billing/usage`
  - `/api/v1/billing/invoices`
- Legacy endpoint aliases are retained for backward compatibility under `/api/payment/*` and `/api/billing/*`.
- Usage metering now persists in database storage for durable reconciliation.

## 2026-02 Tax and Reporting Reliability Update

### Merchant of Record (MOR) behavior
- RunAsh Pay remains the platform MOR for supported hosted billing flows, while sellers remain responsible for business registration and filing obligations in their operating jurisdictions.
- Checkout/session and subscription creation now calculate tax with jurisdiction context for US sales tax and India GST defaults, with support for configured rates from `tax_rates`.
- Tax computation artifacts are persisted as auditable records (`tax_calculations`, `tax_line_items`) linked to checkout sessions, subscriptions, invoices, and payment intents when available.

### Compliance boundary and responsibilities
- **RunAsh platform responsibilities**
  - Compute and store tax breakdown metadata for billing events.
  - Preserve audit traceability by jurisdiction (`country_code`, `state_code`, rule source, and line-item rate details).
  - Expose reporting APIs for finance operations (revenue summary, payouts summary, tax liability by jurisdiction).
- **Merchant responsibilities**
  - Maintain valid tax registrations and filing records per country/state.
  - Validate business-specific exemptions/zero-rated cases and submit returns.
  - Reconcile platform tax summaries with statutory filings and accounting books.

### Risk and rollback guidance
- Risk level: **medium** (adds tax computation and persistence paths in checkout/subscription/webhook flows).
- Rollback: disable tax persistence calls and revert reporting endpoint routing while retaining existing payment contracts.
- Backward compatibility: existing checkout/subscription API fields are preserved; tax payloads are additive.

## Release Note: Checkout Reliability + Customer Vault References (2026-02)

### Impacted flows
- Hosted checkout-link lifecycle (create/activate/expire).
- Customer payment-method management (add/switch/remove).
- Checkout autofill authorization (default/backup method selection + session tracking).

### Implementation details
- Introduced `checkout_links` and `checkout_sessions` entities for amount-rule aware link flows and session-level context/audit data.
- Introduced secure payment method vault references via `customer_payment_method_vault_refs` (provider token IDs only).
- Added `customer_checkout_profiles` with encrypted billing/shipping address fields and default/backup payment method pointers.
- Added APIs for profile management, method management, and checkout autofill authorization.

### Risk + rollback
- **Risk level:** medium (new persistence tables and API surface in payment flows).
- **Primary risk:** malformed profile/method payloads; mitigated with strict schema validation and tokenized-only constraints.
- **Rollback:** disable/avoid new `/api/v1/payment/profile*` and `/api/v1/payment/checkout-links` endpoints and revert migration `2026-02-15_create_checkout_profile_tables.sql` if required.

### Migration note
- Existing payment intent/transaction schemas and field names remain unchanged.
- New capability is additive and backward compatible.

## 2026-02 Customer lifecycle analytics hardening

### Impacted payment/business flows
- Signup-to-checkout conversion tracking.
- Failed payment recovery tracking and recovery effectiveness.
- Plan-level churn/retention analysis and cohort conversion observability.

### What changed
- Added additive lifecycle persistence tables:
  - `customer_profiles`
  - `customer_events`
  - `payment_recovery_events`
- Added lifecycle analytics API for business dashboards (`/api/payment/lifecycle`).
- Added lifecycle event ingestion API with provenance and actor attribution (`/api/payment/lifecycle`, `POST`).
- Exposed lifecycle KPI cards in Payment Dashboard and Subscription/Billing portal surfaces.

### Risk and rollback
- **Risk level:** medium (new analytics queries and UI reads).
- **Rollback:** remove lifecycle cards + API routes while keeping additive tables in place; existing payment contracts continue unchanged.
- **Backward compatibility:** preserved; existing field names and billing endpoints are not removed or renamed.

## 2026-02 Webhook idempotency + replay reliability update

### Impacted flows
- Stripe invoice payment webhooks (`invoice.payment_succeeded`, `invoice.payment_failed`).
- Stripe subscription lifecycle webhooks (`customer.subscription.created|updated|deleted`).
- Stripe payout status webhooks (`payout.*`).

### Implementation details
- Added durable webhook event storage in `webhook_events` with strict status lifecycle:
  - `received` (accepted + pending processing)
  - `processed` (domain handling completed)
  - `failed` (processing exhausted and scheduled for retry)
  - `dead_letter` (exceeded replay threshold)
- Added idempotent ingestion keyed by `(provider, event_id)` to prevent duplicate side effects.
- Added ordered replay of failed/dead-letter events by `received_at ASC` through admin-protected internal endpoint:
  - `POST /api/internal/billing/webhook/replay`
- Added bounded retry/backoff metadata (`processing_attempts`, `next_retry_at`, `last_error`) for auditability.
- Logging path now uses redacted structured logs and omits raw payment/auth payloads.

### Risk + rollback
- **Risk level:** medium (adds durable processing state and replay paths to webhook handling).
- **Rollback:** revert webhook route/service wiring and disable replay endpoint; table is additive and can remain without impacting existing payment contracts.
- **Backward compatibility:** preserved for existing billing/subscription API contracts and field names.

## UI reliability update: unified payment workspace

Business-facing payment pages now consume a shared section system used across startup/business/dashboard routes.

### Backward compatibility
- Existing `/api/v1/payment/*` and `/api/v1/billing/*` contracts are unchanged.
- Field names and signatures remain stable.

### Operational impact
- Button actions in the payment workspace are wired to live API routes (no static placeholders).
- Each section emits explicit loading/success/error UX states for operator clarity.

### Rollback
- Revert the unified payment page components and restore previous page components for each payment route.

## Implementation note: repository-backed payment flow

The payment processing path now uses repository-backed persistence for:
- payment methods
- payment intents
- payment transactions
- refunds

### Operational impact
- **Duplicate protection:** idempotency keys are now stored and reused for create-intent and confirm flows.
- **Auditability:** transaction outcomes are derived from provider events/status and captured in persisted provider event trails.
- **Compatibility:** existing external API response fields and route contracts are preserved.

## 2026-02 Portal lifecycle + checkout-link operations hardening

### What changed

- Expanded checkout link domain with list/update/disable/expire behavior under `/api/v1/payment/checkout-links`.
- Added portal-oriented profile management endpoints for default/backup method, billing, and shipping details.
- Added lifecycle action endpoints for:
  - payment method updates,
  - failed payment retry workflows,
  - subscription-state management intents.
- Added dashboard component wiring to surface portal metrics and lifecycle actions in payment dashboard cards.
- Added `portal_lifecycle_actions` table for action audit history.

### Risks and rollback

- **Risk:** lifecycle events may be created without downstream processor execution if external providers are unavailable.
- **Mitigation:** actions are persisted for observability and replay workflows.
- **Rollback:** remove new v1 portal/checkout-link routes and UI triggers while leaving additive tables intact; prior APIs continue functioning.

## 2026-02 reliability increment: webhook state machine, replay/rollback, and reporting depth

### Impacted payment/auth flows
- Stripe billing webhook intake and signature validation.
- Subscription, invoice, payment intent, and payout domain state projection.
- Finance/operator reporting visibility paths.

### What changed
- Hardened webhook signature gate with strict Stripe header parsing + tolerance enforcement before event construction.
- Preserved backward-compatible webhook contract while strengthening idempotent duplicate handling for already processed events.
- Extended durable webhook processing state handling (`received` → `processed` / `failed` / `dead_letter`).
- Added domain tables populated by webhook handlers for subscription, invoice, payment, and payout lifecycle data.
- Added operator endpoints for diagnostics and targeted rollback/replay:
  - `GET /api/internal/billing/webhook/events`
  - `POST /api/internal/billing/webhook/events/:eventId/rollback`
- Expanded payment reporting API payloads with:
  - `revenue_transactions`
  - `payout_visibility`
  - `tax_breakdown`

### Risk + rollback
- Risk level: **medium** (webhook/domain persistence path extension, no public contract removal).
- Backward compatibility: existing payment/reporting response summary fields are preserved and additive fields were introduced.
- Rollback strategy:
  1. Revert webhook route/service changes to prior handler implementation.
  2. Disable new diagnostics/rollback endpoints.
  3. Keep additive tables in place (non-breaking) or archive if necessary.

### Validation commands
- `npm run lint`
- `npm run build`

## 2026-02 tax accounting & finance operations increment

### Scope delivered
- Added product tax classification support for checkout/subscription tax computation (`physical_goods`, `digital_services`, `professional_services`).
- Added transaction-level tax line item persistence for auditable per-payment tax records (`transaction_tax_line_items`) with jurisdiction, rate, amount, and tax type.
- Exposed tax-inclusive invoice financial summaries and expanded reporting payloads with revenue-tax and operations-finance summary views.

### Compliance assumptions
- RunAsh computes indirect tax estimates from billing/shipping location and configured tax rates; this is an operational aid and not legal advice.
- Tax registrations, exemptions, and filing cadence remain jurisdiction-dependent and must be maintained by operations/finance teams.
- Stripe invoice/webhook-derived tax is treated as source-of-truth when available; fallback models are used when provider tax artifacts are absent.

### Responsibilities matrix
- **Engineering**
  - Keep tax schema backward compatible and additive for existing payment contracts.
  - Ensure sensitive payment/auth fields are not logged in tax and reporting flows.
  - Preserve auditability across checkout, subscription, invoice, and transaction tax records.
- **Finance**
  - Validate tax classifications and jurisdiction mappings for products/plans.
  - Reconcile revenue/tax summaries with accounting books and statutory returns.
- **Operations**
  - Monitor payout eligibility and remittance exposure via reporting endpoints.
  - Coordinate rollback to previous tax persistence/reporting behavior if anomalies are detected.

### Risk and rollback notes
- Risk: **medium** (expanded tax persistence and reporting joins).
- Rollback: disable transaction tax line item writes and finance summary aggregations while preserving existing base revenue/payout summaries.

## 2026 Update: RunAshChat Instant Checkout via Relay Skill

### Payment-impacting behavior changes
- Relay agent now supports `initiate_link_checkout` for natural-language purchase intents in RunAshChat.
- The flow performs mandatory validator-gate checks (HITL/MFA/PII-safe logging) before calling RunAsh Pay.
- For blocked/failed external calls, a fallback path (`manual_review_queue` or `relay_agent_manual_checkout`) is returned for operator continuity.

### Risk and rollback
- Risk level: **medium** (touches checkout orchestration in agent tooling).
- Rollback: remove `initiate_link_checkout` from relay tool registry and API `tools` enum; existing payment APIs remain unchanged.

### Contract compatibility
- Existing payment/API contracts are preserved.
- New tool uses explicit schema validation and does not alter existing field names.


## Payment validator decision contract

Checkout and create-intent flows now attach a structured `validatorDecision` payload:

```json
{
  "requiresHitl": true,
  "requiresMfa": false,
  "allowed": false,
  "reasonCodes": ["HITL_CONFIRMATION_REQUIRED"]
}
```

Operational notes:
- Validator executes **before** Stripe payment intent/session creation.
- Threshold checks are currency-normalized across INR/USD using configurable conversion rate.
- Audit payloads sanitize sensitive card fields and only persist masked last4 formats.

## RunAshChat Link Quick Pay rollout notes

### Flow impact
- Buy-intent chats can surface a Link quick-pay action card from Relay tool output.
- Existing payment APIs and field contracts remain unchanged.

### UX details
- Primary CTA: `Pay with Link *{last4}`.
- Lifecycle states: `idle` → `processing` → `success | failed`.
- Badge condition: show `Sold through Link` when the item is Link-eligible and tagged as digital.
- In-chat quick-pay now displays the payment attempt timeline for primary/fallback transparency.

### Risk and rollback
- Risk: low (UI + metadata rendering layer only).
- Rollback: remove `metadata.linkQuickPay` rendering path; existing checkout flow remains available.

## Reliability Addendum: Default→Backup Method Fallback (2026-02)

For checkout execution reliability, payment confirmation now uses a two-step deterministic policy within a single checkout action:
1. Charge `default_payment_method` first.
2. On retryable/default-method failure codes, automatically retry using `backup_payment_method`.

### Audit and response contract
- Every execution attempt is written to transaction timeline metadata as `attempt_timeline[]` entries (`method`, `reason`, `status`, `timestamp`).
- Confirm responses include additive fields: `attemptedMethods`, `fallbackUsed`, `finalStatus`, and `attemptTimeline`.
- Confirm idempotency remains single-key per checkout action across retries.

### Risk and rollback
- **Risk:** low-medium (execution branching), limited to payment confirmation path.
- **Rollback:** disable backup fallback logic and retain first-attempt-only confirmation while preserving stored timeline history.

## Reliability Addendum: RunAsh AI Link / Instant Checkout

### New persisted models
- `checkout_attempt_results` for checkout attempts and outcomes linked to `checkout_sessions`.
- Existing `customer_checkout_profiles` continues to store default + backup method references.
- Existing usage billing event models continue to record prompt/completion tokens, delta time, metadata, and pricing model.

### New/expanded APIs
- `GET/POST /api/v1/payment/checkout-attempts` for checkout attempt retrieval + ingestion.
- `POST/PUT /api/v1/payment/usage/ingest` for manual + batch usage ingestion with custom metadata.
- `GET /api/payment/analytics` now includes checkout analytics + attempt result timeline.
- `GET /api/v1/payment/profile/portal/metrics` now includes `checkoutAnalytics` block.
- `GET /api/v1/payment/reporting` now returns transaction-level trail fields for finance ops.

### Risk + rollback
- Risk: low-medium (additive schema/API/UI only).
- Rollback: revert API and UI additions; keep additive DB table as inert if unused.

---

## 9) Relay checkout safety policy (implementation update - 2026-02)

### What changed

Relay now runs a payment safety middleware before calling Link checkout execution:

- Middleware: `lib/payments/validator-safety-gate.ts`
- Enforced output policy decision object:
  - `allowed`
  - `requiresHitl`
  - `requiresMfa`
  - `reasonCodes`
  - `requires_hitl` (backward-compatible alias)
  - `requires_mfa` (backward-compatible alias)
  - `reason_codes` (backward-compatible alias)
- Currency normalization utility usage ensures USD/INR thresholds are compared on normalized equivalents.

### Enforced thresholds

1. **HITL threshold**
   - Trigger when USD-equivalent amount exceeds `10000` cents ($100).
   - Requires `human_confirmed=true`.
2. **MFA threshold**
   - Trigger when INR-equivalent amount exceeds `800000` paise (₹8,000).
   - Requires `mfa_verified=true`.

### Auditability and security hardening

- Relay tool lineage inputs for checkout payloads are now sanitized before persistence.
- Card-like values are stored only in masked form (`*4242` style).
- CVV/security code fields are redacted.
- No payment flow contract fields were removed; new policy fields are additive for backward compatibility.

### Operational risk and rollback

- **Primary risk:** stricter policy may increase `validation_failed` outcomes for high-value payments without explicit confirmations.
- **Mitigation:** clients must include HITL and MFA flags for qualifying transactions.
- **Rollback path:** revert validator-safety-gate integration in Relay tool execution path and redeploy.

## RunAsh AI Link: Fallback and Idempotent Attempt Persistence

The Link checkout service now enforces a deterministic two-step method strategy for instant checkout:

1. Attempt with default Link method (`stripe_link`).
2. Retry with `backup_payment_method` only when first failure is retryable.

Operational guarantees:
- **Backward compatibility:** Existing checkout request fields are preserved; `backup_payment_method` and `idempotency_key` are additive.
- **Auditability:** Every attempt is persisted with shared idempotency key, request id, attempt number, method name, status code, provider status, and retryable marker.
- **Unified result contract:** returns `fallback_used`, `attempted_methods`, and `final_status` so Relay can provide stable UX behavior regardless of primary/fallback outcomes.
- **Security hardening:** Avoid logging sensitive payment method payload fields; only minimal, non-sensitive attempt metadata is persisted.

Rollback strategy:
- Disable fallback behavior by omitting `backup_payment_method` while preserving primary flow behavior.
- Preserve persistence writes for visibility during rollback verification.

## 2026-02 Instant Checkout Reliability Update (Tax Transparency)

### What changed
- Added region-aware tax preview utility supporting India GST and USD-region VAT/sales-tax estimates.
- Tax preview calculation now treats INR/USD checkout amounts as minor units and converts to display-ready subtotal/tax/total values for confirmation UX.
- Added pre-charge confirmation gate requiring explicit post-preview user confirmation.
- Added subtotal/tax/total surface in chat checkout card and activity summary payloads.
- Final pay action remains blocked until an explicit in-card confirmation step is completed after preview render.
- Added tax line-item metadata persistence for downstream reporting.

### Risk and rollback
- **Risk level:** Medium (touches payment initiation orchestration path).
- **Rollback:** Revert `lib/agent-tools/initiate-link-checkout.ts` + `lib/services/link-checkout-service.ts` to prior behavior and redeploy.
- **Compatibility:** Existing field names and payment API signatures are preserved; new tax metadata fields are additive.

## Routing and compliance policy enforcement (2026-02)

Business billing flows now apply a mandatory edge-routing policy layer before outbound Stripe operations.

### Routing behavior
- Merchant/customer region normalization determines route and profile:
  - India path: `region_route=IN_EDGE`, `compliance_profile=IN_RBI_PROFILE`
  - US/default path: `region_route=US_EDGE`, `compliance_profile=US_STRIPE_PROFILE`

### Metadata and auditability
- Route context is attached to outbound payment metadata as additive fields:
  - `region_route`
  - `residency_policy`
  - `compliance_profile`
- Payment intent metadata additionally carries `payment_context = { regionRoute, residencyPolicy }` to preserve region-aware execution context without changing API signatures.
- Compliance/audit records now include a structured route envelope:
  - request ID
  - route decision (`regionRoute`, `residencyPolicy`, `complianceProfile`, `reason`)
  - sanitized metadata only
- Provider-bound outbound metadata is sanitized before dispatch to prevent sensitive auth/payment data exposure in gateway logs and events.

### Risk and rollback
- Risk level: low-to-medium (policy misclassification could route traffic to default US edge).
- Rollback: revert policy-layer wiring in billing routes and Relay link checkout skill; existing payment contracts remain intact because route fields are additive metadata.

## Reliability Execution Addendum (AI Link / Relay / Stripe Link)

### Backward-compatible API additions
- Added profile controls endpoint set for default/backup method management and billing history/retry inspection.
- Added analytics summary endpoint for checkout conversion, failed recovery, fallback usage, and finance summaries.
- Added compatibility mirror route under `/api/payment/analytics/summary`.

No existing payment contract was removed or renamed.

### Usage-based billing hook contract
`POST /api/v1/payment/create-intent` supports optional `usageHook` object:
- prompt/completion token counts,
- delta processing time,
- metadata,
- pricing model.

Hook ingestion is additive and does not break intent creation behavior.

### Risk and rollback notes
- **Risk:** Low-to-medium (new read/write API surfaces + additive metadata/hook ingestion).
- **Mitigation:** Existing routes and fields retained; failures in optional hooks do not alter core contract shape.
- **Rollback:** Revert new routes and keep existing `/api/v1/payment/*` and `/api/payment/*` behavior unchanged.

## 2026-02 Relay tool contract clarification: `initiate_link_checkout`

### Scope
- Relay checkout tool contract now explicitly documents `currency` enum support (`INR | USD`) with default handling (`USD` when omitted).
- Runtime argument validation now returns structured `validation_issues` (`path`, `message`) when payload parsing fails before execution.

### Backward compatibility
- Existing payload field names (`merchant_id`, `amount`, `currency`, `product_metadata`) remain unchanged.
- Existing relay tool name and action routing remain unchanged (`initiate_link_checkout`).

### Risk + rollback
- Risk: low (additive response field + doc clarifications).
- Rollback: remove `validation_issues` from tool response mapping and revert doc section; payment API contracts remain intact.

## 2026-02 RunAshChat Link Quick Pay Interaction Hardening

### Scope
- RunAshChat assistant checkout cards using the Relay tool `initiate_link_checkout`.

### UX and flow behavior
- Introduced a deterministic UI state machine for checkout progression: `idle -> processing -> success | failed`.
- Added explicit retry affordance after failed confirmation/tool execution.
- Preserved existing pre-charge confirmation gating for tax preview-based final charge consent.
- Added `Sold through Link` eligibility badge for digital product merchandising clarity.

### Compatibility and contract notes
- No breaking API/tool changes: `initiate_link_checkout` payload shape and key names are unchanged.
- Retry uses the same confirmation payload and confirmation flags as the primary attempt.
- Client-side updates are additive and do not alter backend response contracts.

### Risk and rollback
- **Risk:** Low (UI-level state and retry handling only).
- **Rollback:** Revert Link quick-pay button state/error handling and retry wiring from chat message renderer.

## 2026-02 Business reliability addendum: profile controls, analytics slices, and financial attempt reporting

### Delivery scope
- Added billing detail management support within checkout profile persistence (`billing_details_encrypted`).
- Added dedicated billing details profile API for customer portal/profile flows.
- Added analytics slice endpoints for:
  - checkout conversion,
  - payment failures + recovery,
  - fallback usage,
  - revenue/payout/tax summaries.
- Added checkout-attempt financial aggregation support for reporting trails.
- Exposed new metrics in payment dashboard and customer portal sections.

### Impacted flows
- RunAshChat AI Link instant checkout tracking (`/api/v1/payment/checkout-attempts`).
- Customer default/backup method management and billing detail profile updates.
- Finance-read analytics/reporting observability in business payment UI.

### Risk and rollback
- **Risk:** Medium (expanded analytics/profile surface + additive profile column migration).
- **Rollback:**
  1. Revert new `/api/v1/payment/analytics/*` slice routes.
  2. Revert `/api/v1/payment/profile/billing-details` route.
  3. Revert `billing_details_encrypted` usage while leaving existing profile fields intact.
  4. Revert UI fetch wiring in `components/payment/unified-payment-sections.tsx`.

### Contract safety notes
- Existing payment/profile API signatures are preserved.
- Default/backup payment method field names are unchanged.
- New payload fields are additive; no required existing field was renamed or removed.


## RunAshChat Instant Checkout: Tax Estimation and Confirmation Gate

To harden reliability for conversational checkout flows, RunAshChat Instant Checkout now enforces:

1. **Tax estimator stage**: subtotal + GST/VAT + total payable are calculated before checkout execution.
2. **Preview-first confirmation**: users must confirm after seeing the tax preview before final capture proceeds.
3. **Tax metadata persistence**: tax line items are attached to transaction metadata for downstream reporting and invoice export.

Risk and rollback:
- Risk: low-to-medium (validation hardening may block incomplete confirmation payloads).
- Rollback: disable preview confirmation gating in the checkout tool payload path and redeploy, while preserving transaction metadata writes.


## 2026-02 Business portal reliability release: portal surfaces + analytics visibility

### Delivered capabilities
- Portal UI surfaces now cover operational payment responsibilities end-to-end:
  - payment methods (default + backup),
  - billing profile,
  - subscriptions,
  - invoices and receipts.
- Dashboard cards and badges are now directly backed by billing/profile/analytics APIs with explicit loading/error states.

### Business API updates
- Method CRUD expansion on profile routes:
  - `GET|PUT|PATCH|DELETE /api/v1/payment/profile/methods/:id`
- Failed payment recovery trigger:
  - `POST /api/v1/payment/profile/portal/retry-failed-payment`
- Invoice receipt retrieval:
  - `GET /api/v1/billing/invoices/:id/receipt`
- Analytics visibility additions:
  - `GET /api/v1/payment/analytics/churn`
  - `GET /api/v1/payment/analytics/mrr-revenue`
  - `GET /api/v1/payment/analytics/payout-tax-visibility`

### Flow impact and compatibility
- Affected flows: customer billing portal, renewal recovery operations, finance visibility dashboards.
- Compatibility: additive changes only; existing contracts preserved.

### Risk and rollback
- Risk level: Medium (new pages + additional analytics endpoints).
- Rollback plan:
  1. Revert newly added payment portal page routes.
  2. Revert new analytics and retry/receipt API endpoints.
  3. Keep existing subscription/payment/invoice contracts unchanged.

## Reliability Sprint Update — Deterministic Payment & Usage Core

### Implemented controls
- Migrated payment-critical flows to deterministic persisted records (no random outcome simulation in payment execution paths).
- Enforced idempotent webhook lifecycle with retry-safe processing and dead-letter tracking.
- Confirmed persistent entities for intents, transactions, checkout links, usage events, webhook events, and tax line items.
- Enabled token/time usage ingestion in single-event and batch modes with custom metadata support.
- Strengthened encryption-key policy for sensitive billing profile fields to require explicit secure key material in production.

### Risk and rollback
- **Risk:** Medium (webhook lifecycle state machine changed to include processing claim and dead-letter materialization).
- **Rollback:** Revert webhook state transition changes and dead-letter table writes; retain event uniqueness for duplicate safety.

## 2026-02 bank account lifecycle reliability update

### Changes
- Added customer-owned update/archive endpoints for bank accounts:
  - `PATCH /api/v1/payment/profile/bank-accounts/:id`
  - `DELETE /api/v1/payment/profile/bank-accounts/:id`.
- Delete requests are processed as auditable soft-delete operations (`is_active=false`, `archived_at=<timestamp>`).
- Portal UI action buttons now execute real handlers for manage/edit/archive/delete account lifecycle tasks.
- Added primary-account invariant checks to prevent invalid account states during archive/update operations.

### Impacted flows
- Customer billing portal bank account lifecycle management.
- Settlement preference management where a primary active account is required.

### Risk and rollback
- Risk: medium (mutation behavior now enforces stronger state invariants).
- Rollback:
  1. Revert bank account `PATCH/DELETE` route handlers and portal UI action wiring.
  2. Keep `archived_at` column as additive schema metadata (safe), or stop consuming it in UI badges.

## 2026-02 business payment auth reliability note

- Business payment endpoints continue to enforce existing role/scope checks, now sourced from canonical Better Auth-backed session extraction.
- Backward compatibility preserved for payment payload/API contracts; only authentication runtime plumbing changed.
- Operational mitigation: if business billing auth anomalies appear, rollback by reverting auth migration and restoring legacy server session verification.

## Auth migration dependency tracking (2026-02)

- Business payment flows must validate auth migration readiness using `RUNASH-AUTH.md` current implemented/planned phases before rollout gating decisions.
- Security alignment and redaction constraints remain normative in `SECURITY.md`.
- Keep payment rollout notes synchronized with these docs per `docs/DOC_GOVERNANCE.md`.

## Reliability updates (2026-02)

- Usage aggregate upserts are now null-safe for `subscription_id` by using a normalized conflict scope key.
- Monthly usage reads now sum matching aggregate rows to avoid undercounting in environments that previously allowed multiple `NULL subscription_id` rows.
- Rollback plan: remove the null-safe unique index and revert to the previous conflict target if downstream consumers depend on per-row fragmentation behavior.


## Implemented vs Planned (Operational clarity update)

### Implemented
- Admin-management CRUD APIs now exist for users, roles, permissions, sessions, audit logs, and feature-flag administration.
- Current payment/business release gates can rely on these implemented admin surfaces for role/permission governance and auditability.

### Planned
- Full Better Auth route replacement and Drizzle migration artifact rollout remain planned phases and are not prerequisites for current additive payment API flows.

## Phased rollout + rollback policy for auth-dependent business payment flows (2026-02)

### Phase gates
- **Internal:** business/admin operators only.
- **10%:** controlled cohort with hourly KPI review.
- **50%:** maintain stable auth/payment KPIs for at least 24h before expansion.
- **100%:** only after no Sev1/Sev2 payment-auth incidents in the previous 48h.

### Required KPI checks before each phase
- Auth error rate remains within baseline control band.
- Session invalidation rate does not breach 3% threshold.
- Admin 403 anomaly rate remains below 1%.
- Payment/auth incident count is zero for release-blocking severities.

### Compatibility and rollback
- Backward compatibility remains required: no payment payload field rename/removal in this rollout.
- Rollback path: disable Better Auth flag, preserve existing payment API signatures, and revert only auth gating behavior if anomalies persist.

## Security & reliability addendum — auth/payment observability

To preserve payment and auth reliability under the active service override:

- Payment/auth-adjacent audit trails now rely on structured event logging with sensitive-field redaction before persistence.
- Monitoring dashboards should consume `GET /api/admin/analytics/security` and `GET /api/admin/analytics/auth` for auth failure and privileged-operation trends that can impact checkout or account access continuity.
- Raw secrets/credentials/tokens/payment artifacts must never be logged; only sanitized metadata is permitted in audit context.

### Risk and rollback note
- **Risk:** Low. Changes are additive telemetry + sanitization and preserve existing API contracts.
- **Rollback:** Disable consumption of new dashboard fields/endpoints and revert structured event emitters if any unforeseen noise/volume issue occurs.

## 2026-02 canonical admin role baseline compatibility note

- Payment-auth-adjacent admin routes now align to canonical RBAC baselines: `viewer` (dashboard read-only), `operator` (restart/cache-clear operational controls), and `admin` (full CRUD/system management).
- Legacy role values remain accepted for compatibility, but authorization capability evaluation maps them to the baseline matrix to prevent lockouts during migration.
- Role assignment APIs normalize stored role values to canonical baseline roles, while preserving existing payment API signatures and payload contracts.
- **Risk:** Low to medium (authorization tightening can surface previously over-permissive access patterns).
- **Rollback:** Revert canonical role normalization and restore legacy role persistence/mapping paths while keeping payment contract schemas unchanged.


## 2026-02 admin governance endpoint reliability note

- Payment-adjacent admin governance APIs now include stricter schema validation and server-side pagination/filtering for users/roles/permissions/sessions/audit/security event datasets.
- Auth/session support endpoints now include explicit `GET /api/auth/get-session` and `POST /api/auth/refresh` compatibility handlers to reduce rollout mismatch risk for middleware/session checks.
- Backward compatibility: payment API contracts and field names are unchanged; these are additive auth/admin reliability controls only.
- Rollback: revert new auth/admin route handlers and RBAC storage table reads while preserving existing payment payload contracts.

## 2026-02 auth observability alignment note (payment reliability)

- Payment contract fields and API signatures remain unchanged.
- Auth/admin telemetry used by payment-adjacent operations now adds:
  - structured forbidden-action + session-invalidation counters,
  - suspicious-login and permission-abuse alert categories,
  - role-scoped monitoring payload visibility for operational dashboards.
- Sensitive payment/auth payload elements continue to be redacted prior to logging/audit persistence.
- Rollback: revert observability emitter changes while keeping payment checkout/refund request/response contracts untouched.

## Auth-related payment impact, risk, and rollback (final)

### Impact summary
- Business and startup payment flows remain auth-gated by server-session validation and RBAC permission checks.
- No payment contract changes: existing endpoint signatures and field names remain backward compatible.
- Auth/RBAC hardening affects access control behavior and rollout operations, not payment payload structure.

### Risk and mitigation summary
- **Risk:** rollout errors can deny valid operators/admins from payment surfaces.
- **Risk:** RBAC route-policy mistakes can cause authorization drift on finance/admin operations.
- **Mitigation:** percentage-gated rollout, metric-based promotion gates, and immediate rollback switch.

### Phased rollout checklist
- [ ] **Internal-only:** validate auth/session/RBAC behavior for payment create, confirm, refund, billing, and portal actions.
- [ ] **10% rollout:** enable `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT=10` and monitor for one business cycle.
- [ ] **50% rollout:** promote only if auth and payment authorization metrics stay healthy.
- [ ] **Full cutover:** set `FEATURE_FLAG_USE_BETTER_AUTH_PERCENT=100` and keep fallback window active.

### Explicit rollback triggers
- Auth/session error rate above 2x baseline for 15+ minutes.
- Any payment-impacting auth incident (unauthorized action or widespread authorization failure).
- Admin/payment permission-denied anomaly rate above agreed thresholds.
- Customer checkout/billing funnel degradation attributed to auth failures.

### Rollback actions
- Disable Better Auth rollout (`FEATURE_FLAG_USE_BETTER_AUTH=false`).
- Confirm legacy compatibility session behavior and payment access restoration.
- Re-run payment auth smoke tests before staged re-enable.


## Auth/session migration note (no payment contract change)

- The Better Auth migration updates only session validation helpers and client auth access utilities.
- Payment API field names, request/response contracts, and settlement flows remain unchanged in this change set.
- Rollback for auth compatibility is feature-flagged via `FEATURE_FLAG_ALLOW_LEGACY_NEXT_AUTH_FALLBACK`; payment processing behavior is unaffected by toggling this flag.

## 2026-02 identity protocol expansion impact note (payment compatibility)

- Added enterprise identity capabilities (SSO provider management, SCIM provisioning, OAuth Device Grant, SIWE) to strengthen auth posture around payment-capable accounts.
- **Payment contract impact:** none. Existing payment API field names, request/response schemas, and settlement contracts remain unchanged.
- **Risk:** misconfigured identity providers can block operator access to payment tooling.
- **Rollback:** disable/undo identity-provider configs at admin layer; payment APIs continue to operate with existing auth methods.

## 2026-02 payment/auth linkage implementation note

### Impacted flows
- Stripe customer creation/update webhooks now attempt deterministic linkage to auth users (`user_id` metadata first, email fallback second).
- Subscription lifecycle events (`customer.subscription.created|updated|deleted`) now persist payment-auth linkage state for monitoring and reconciliation.
- Admin operators now have dedicated linkage health visibility at `/admin/payment-auth`.

### Risk assessment
- **Primary risk:** webhook customer records without `user_id` metadata and non-matching email can remain unlinked.
- **Mitigation:** keep email fallback enabled, monitor stale/unlinked counts, and run replay/rollback tooling for webhook events.
- **Security posture:** signed payload verification is enforced before Stripe event construction; no sensitive auth/payment payload fields are logged.

### Rollback plan
1. Revert webhook-to-linkage plugin wiring while preserving core webhook recording/processing.
2. Keep additive table in place (safe to retain; does not affect existing payment API contracts).
3. Re-run webhook replay only after verification settings are restored.

### Operational checks
- Validate admin endpoint `GET /api/admin/payment-auth/health` as part of release smoke tests.
- Track these signals during release window:
  - `unlinkedCustomers`
  - `usersWithoutCustomer`
  - `staleLinks`
- Escalate if `unlinkedCustomers` trend increases across two consecutive webhook batches.
