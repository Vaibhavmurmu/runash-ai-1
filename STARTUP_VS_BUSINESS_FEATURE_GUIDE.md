# Startup vs Business Implementation Guide

## Overview
This document provides developers with clear guidelines for implementing Startup and Business tier features in RunAsh Pay.

## Feature Flag System

### Database Schema for Feature Flags

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  tier ENUM('startup', 'business', 'all') NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO feature_flags (name, tier, is_enabled) VALUES
  ('advanced_analytics', 'business', TRUE),
  ('recurring_payments', 'business', TRUE),
  ('whitelist_ips', 'business', FALSE),
  ('custom_reports', 'business', FALSE),
  ('api_rate_limit_high', 'business', TRUE),
  ('multi_user_accounts', 'business', TRUE);
```

### Feature Flag Implementation in Code

```typescript
// lib/utils/feature-flags.ts

interface FeatureFlags {
  // Startup & Business
  basicPayments: boolean;
  qrCode: boolean;
  paymentLinks: boolean;
  webhooks: boolean;
  
  // Business Only
  advancedAnalytics: boolean;
  recurringPayments: boolean;
  customReports: boolean;
  multiUserAccounts: boolean;
  ssoIntegration: boolean;
  whitelistIps: boolean;
  advancedFraudDetection: boolean;
  kycAml: boolean;
  batchProcessing: boolean;
}

export async function getFeatureFlagsForOrg(orgId: string): Promise<FeatureFlags> {
  const org = await getOrganization(orgId);
  
  const baseFlags: FeatureFlags = {
    basicPayments: true,
    qrCode: true,
    paymentLinks: true,
    webhooks: true,
    advancedAnalytics: org.tier === 'business',
    recurringPayments: org.tier === 'business',
    customReports: org.tier === 'business',
    multiUserAccounts: org.tier === 'business',
    ssoIntegration: org.tier === 'business',
    whitelistIps: org.tier === 'business',
    advancedFraudDetection: org.tier === 'business',
    kycAml: org.tier === 'business',
    batchProcessing: org.tier === 'business',
  };
  
  return baseFlags;
}
```

## Startup Tier Implementation

### Key Characteristics
- Cost-efficient
- Simple, focused features
- Easy integration
- Community support

### Core Features Implementation

#### 1. Basic Payment Processing

```typescript
// app/api/v1/payments/create/route.ts

export async function POST(request: Request) {
  const { amount, payer_upi, payee_upi, description } = await request.json();
  
  // Input validation
  if (!isValidUPI(payer_upi) || !isValidUPI(payee_upi)) {
    return Response.json({ error: 'Invalid UPI' }, { status: 400 });
  }
  
  if (amount < 1 || amount > 100000) {
    return Response.json({ error: 'Invalid amount' }, { status: 400 });
  }
  
  // Create transaction
  const transaction = await db.query(
    `INSERT INTO transactions (org_id, user_id, type, amount, status, payment_method)
     VALUES ($1, $2, 'payment', $3, 'pending', 'upi')
     RETURNING id`,
    [orgId, userId, amount]
  );
  
  // Initiate UPI payment
  const upiResponse = await initiateUPIPayment({
    amount,
    payer_upi,
    payee_upi,
    transaction_id: transaction.rows[0].id
  });
  
  return Response.json({
    payment_id: transaction.rows[0].id,
    qr_code: upiResponse.qr_code,
    status: 'pending'
  });
}

function isValidUPI(upi: string): boolean {
  // UPI ID format: name@bankcode
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]{3,}$/;
  return upiRegex.test(upi);
}
```

#### 2. Payment Links

```typescript
// app/api/v1/payment-links/route.ts

export async function POST(request: Request) {
  const { amount, description, expiry_days = 30 } = await request.json();
  
  const linkId = generateId();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiry_days);
  
  await db.query(
    `INSERT INTO payment_links (id, org_id, amount, description, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [linkId, orgId, amount, description, expiryDate]
  );
  
  const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${linkId}`;
  
  return Response.json({
    id: linkId,
    url: linkUrl,
    amount,
    expires_at: expiryDate
  });
}
```

#### 3. QR Code Generation

```typescript
// lib/services/qr-service.ts

export async function generatePaymentQR(payeeUPI: string, amount: number): Promise<string> {
  // Format: upi://pay?pa=upiid&pn=name&am=amount&tn=description
  const upiString = `upi://pay?pa=${payeeUPI}&am=${amount}&tn=RunAsh%20Payment`;
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(upiString);
  
  return qrCode;
}
```

### Dashboard for Startups

Simple, focused metrics only:

```typescript
// app/dashboard/startup/page.tsx

export default function StartupDashboard() {
  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">₹45,000</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold">99.2%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple transaction list */}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button className="w-full">Create Payment Link</Button>
        <Button className="w-full">Generate QR Code</Button>
        <Button className="w-full">View Reports</Button>
        <Button className="w-full">API Documentation</Button>
      </div>
    </div>
  );
}
```

## Business Tier Implementation

### Key Characteristics
- Enterprise-grade features
- Advanced security
- Detailed analytics
- Dedicated support

### Advanced Features

#### 1. Recurring Payments

```typescript
// lib/services/recurring-payment-service.ts

interface RecurringPaymentSchedule {
  id: string;
  org_id: string;
  customer_id: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: Date;
  end_date?: Date;
  status: 'active' | 'paused' | 'cancelled';
  max_attempts: number;
  created_at: Date;
}

export async function createRecurringPayment(
  orgId: string,
  schedule: Omit<RecurringPaymentSchedule, 'id' | 'created_at'>
): Promise<RecurringPaymentSchedule> {
  const id = generateId();
  
  const result = await db.query(
    `INSERT INTO recurring_payments 
     (id, org_id, customer_id, amount, frequency, start_date, end_date, status, max_attempts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, orgId, schedule.customer_id, schedule.amount, schedule.frequency, 
     schedule.start_date, schedule.end_date, 'active', schedule.max_attempts || 3]
  );
  
  // Schedule the first payment
  await scheduleRecurringPayment(id);
  
  return result.rows[0];
}

async function scheduleRecurringPayment(scheduleId: string) {
  const schedule = await db.query(
    'SELECT * FROM recurring_payments WHERE id = $1',
    [scheduleId]
  );
  
  const nextDate = calculateNextPaymentDate(schedule.rows[0]);
  
  // Create a job for the payment
  await createJob({
    type: 'recurring_payment',
    schedule_id: scheduleId,
    scheduled_for: nextDate
  });
}

function calculateNextPaymentDate(schedule: RecurringPaymentSchedule): Date {
  const next = new Date(schedule.start_date);
  
  switch (schedule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  
  return next;
}
```

#### 2. Advanced Reconciliation

```typescript
// lib/services/reconciliation-service.ts

export async function autoReconcile(orgId: string, period: 'daily' | 'weekly' | 'monthly') {
  // Fetch transactions from database
  const dbTransactions = await getTransactions(orgId, period);
  
  // Fetch transactions from UPI gateway
  const gatewayTransactions = await getGatewayTransactions(orgId, period);
  
  // Compare and identify discrepancies
  const discrepancies = identifyDiscrepancies(dbTransactions, gatewayTransactions);
  
  // Log reconciliation result
  const result = {
    org_id: orgId,
    period,
    total_db_transactions: dbTransactions.length,
    total_gateway_transactions: gatewayTransactions.length,
    matched: dbTransactions.length - discrepancies.length,
    discrepancies: discrepancies.length,
    status: discrepancies.length === 0 ? 'reconciled' : 'discrepancies_found',
    created_at: new Date()
  };
  
  await db.query(
    `INSERT INTO reconciliation_logs 
     (org_id, period, matched_count, discrepancy_count, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [orgId, period, result.matched, result.discrepancies, result.status]
  );
  
  return result;
}

function identifyDiscrepancies(
  dbTxns: any[],
  gatewayTxns: any[]
): any[] {
  const discrepancies = [];
  
  // Transactions in DB but not in gateway
  for (const dbTxn of dbTxns) {
    const gatewayMatch = gatewayTxns.find(g => g.id === dbTxn.gateway_id);
    if (!gatewayMatch) {
      discrepancies.push({
        type: 'missing_in_gateway',
        transaction: dbTxn
      });
    }
  }
  
  // Transactions in gateway but not in DB
  for (const gatewayTxn of gatewayTxns) {
    const dbMatch = dbTxns.find(d => d.gateway_id === gatewayTxn.id);
    if (!dbMatch) {
      discrepancies.push({
        type: 'missing_in_db',
        transaction: gatewayTxn
      });
    }
  }
  
  return discrepancies;
}
```

#### 3. Advanced Analytics Dashboard

```typescript
// app/dashboard/business/page.tsx

export default function BusinessDashboard() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹2,45,000</p>
            <p className="text-sm text-green-600">↑ 12% vs last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,247</p>
            <p className="text-sm text-blue-600">↑ 5% vs last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Success Rate</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">99.82%</p>
            <p className="text-sm text-green-600">↑ 0.12% improvement</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Avg Transaction</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹1,965</p>
            <p className="text-sm text-purple-600">↑ 8% vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Real-time Analytics */}
      <Card>
        <CardHeader><CardTitle>Transaction Trends</CardTitle></CardHeader>
        <CardContent>
          {/* Line chart showing daily transactions over 30 days */}
          <TransactionChart />
        </CardContent>
      </Card>

      {/* Detailed Transaction List */}
      <Card>
        <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
        <CardContent>
          {/* Advanced filtering, sorting, export options */}
          <TransactionTable />
        </CardContent>
      </Card>

      {/* Fraud Analytics */}
      <Card>
        <CardHeader><CardTitle>Fraud Detection</CardTitle></CardHeader>
        <CardContent>
          {/* High-risk transactions, patterns */}
          <FraudAnalytics />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 4. KYC/AML Integration

```typescript
// lib/services/kyc-aml-service.ts

interface KYCVerification {
  org_id: string;
  status: 'pending' | 'verified' | 'rejected';
  government_id: string;
  id_type: 'aadhar' | 'pan' | 'passport' | 'driving_license';
  verified_at?: Date;
  verified_by?: string;
}

export async function initiateKYC(orgId: string, businessInfo: any) {
  // Call KYC provider API (e.g., Truecaller, Onfido)
  const kycResult = await kycProvider.verify(businessInfo);
  
  // Store verification result
  await db.query(
    `INSERT INTO kyc_verifications (org_id, status, government_id, id_type, result_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [orgId, kycResult.status, businessInfo.id_number, businessInfo.id_type, kycResult.raw]
  );
  
  // If verified, update organization
  if (kycResult.status === 'verified') {
    await db.query(
      'UPDATE organizations SET kyc_status = $1, kyc_verified_at = $2 WHERE id = $3',
      ['verified', new Date(), orgId]
    );
  }
  
  return kycResult;
}

export async function performAMLScreening(orgId: string) {
  const org = await getOrganization(orgId);
  
  // Screen against sanctions lists, PEP list
  const amlResult = await amlProvider.screen({
    name: org.name,
    country: 'IN',
    type: 'business'
  });
  
  // Log screening result
  await db.query(
    `INSERT INTO aml_screenings (org_id, status, result_data, screened_at)
     VALUES ($1, $2, $3, $4)`,
    [orgId, amlResult.status, amlResult.raw, new Date()]
  );
  
  return amlResult;
}
```

## API Rate Limiting Based on Tier

```typescript
// middleware/rate-limit.ts

export async function rateLimit(req: Request, orgId: string) {
  const org = await getOrganization(orgId);
  
  const limits = {
    startup: {
      requestsPerMinute: 1000,
      requestsPerDay: 100000,
      burstCapacity: 5000
    },
    business: {
      requestsPerMinute: 100000,
      requestsPerDay: 10000000,
      burstCapacity: 500000
    }
  };
  
  const limit = limits[org.tier];
  
  // Check rate limit using Redis
  const key = `ratelimit:${orgId}:${new Date().getMinutes()}`;
  const current = await redis.incr(key);
  
  if (current > limit.requestsPerMinute) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // Set expiry
  if (current === 1) {
    await redis.expire(key, 60);
  }
  
  return null; // No limit hit
}
```

## Testing Strategy by Tier

### Startup Testing
```typescript
describe('Startup Features', () => {
  test('Basic payment creation', async () => {
    const response = await POST('/api/v1/payments/create', {
      amount: 500,
      payer_upi: 'user@bank',
      payee_upi: 'merchant@bank'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.payment_id).toBeDefined();
  });
  
  test('Payment link generation', async () => {
    const response = await POST('/api/v1/payment-links', {
      amount: 1000,
      description: 'Test Link'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.url).toContain('/pay/');
  });
});
```

### Business Testing
```typescript
describe('Business Features', () => {
  test('Recurring payment creation', async () => {
    const response = await POST('/api/v1/recurring-payments', {
      customer_id: 'cust_123',
      amount: 5000,
      frequency: 'monthly'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('active');
  });
  
  test('Advanced reconciliation', async () => {
    const response = await POST('/api/v1/reconciliation/auto', {
      period: 'daily'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.matched).toBeDefined();
  });
});
```

---

## Migration Path from Startup to Business

When a startup upgrades to business:

```typescript
export async function upgradeToBusinessTier(orgId: string) {
  // Update tier
  await db.query(
    'UPDATE organizations SET tier = $1, updated_at = NOW() WHERE id = $2',
    ['business', orgId]
  );
  
  // Enable business features
  const businessFeatures = [
    'advanced_analytics',
    'recurring_payments',
    'multi_user_accounts',
    'kyc_aml',
    'batch_processing'
  ];
  
  for (const feature of businessFeatures) {
    await db.query(
      `INSERT INTO organization_features (org_id, feature_name, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (org_id, feature_name) DO UPDATE SET enabled = TRUE`,
      [orgId, feature, true]
    );
  }
  
  // Increase API rate limits
  await updateAPILimits(orgId, 'business');
  
  // Send welcome email
  await sendEmail({
    to: org.contact_email,
    subject: 'Welcome to RunAsh Pay Business Tier',
    template: 'business_tier_upgrade'
  });
}
```

---

## Summary

This guide ensures developers understand the feature separation between tiers and can implement features correctly based on the organization type. Use the feature flag system to maintain clean code and enable/disable features as needed.
