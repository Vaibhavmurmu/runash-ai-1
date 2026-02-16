# 🏦 RunAsh AI Pay 


### The Future of Agentic, Intent-Driven Payments

RunAsh AI Pay is a high-performance, multi-agent fintech platform designed to move money at the speed of thought. By replacing traditional banking menus with **Intent-Based Voice Commands** and a **Consensus-Driven Security Layer**, we provide a "Supreme Court for Payments."

---

## 🌟 Core Features

- **🎙️ Voice-Activated Intent:** Pay vendors or check balances hands-free. *"Ash, pay the JCB operator ₹8,000 for site leveling."*
- **🧠 Agentic Consensus (RAPP):** No transaction leaves the account without a "Vote" from three specialized AI agents.
- **🛡️ Biometric Voiceprint:** Text-independent vocal frequency analysis replaces vulnerable passwords.
- **📍 Geo-Fenced Validation:** Enhanced security triggers if transactions occur outside known project areas (e.g., your Bokaro residential plot).
- **📈 Strategist Insights:** Automatic tax-sidekick and budget optimization focused on the Jharkhand 2026 economic landscape.

---

## 🤖 The Agent Suite

RunAsh AI utilizes a multi-agent architecture to ensure safety and precision:

| Agent | Persona | Primary Responsibility |
| :--- | :--- | :--- |
| **Ash** | Lead Orchestrator | Intent parsing, routing, and user communication. |
| **Validator** | Security Guard | Voice biometrics, Geo-fencing, and Fraud detection. |
| **Strategist** | Financial Advisor | Budget health, Tax set-asides, and Wealth growth. |
| **Relay** | The Executer | Deterministic API calls to banking & UPI gateways. |

---

## 🛠️ Technical Specifications

### Agentic Payment Protocol (RAPP)
The system follows a **Lock-Verify-Release** sequence to ensure zero-hallucination execution:

1. **Intent Lock:** Ash identifies the recipient and amount.
2. **Consensus Handshake:** - **Validator** checks voiceprint match ($V > 0.85$) and location.
   - **Strategist** checks category limits (e.g., Construction budget).
3. **Atomic Release:** Relay calls the bank API only upon receiving a cryptographically signed Consensus Token.

### Security Thresholds
- **Tier 1 ( < ₹8,000 ):** Voice Intent + Voice Biometric.
- **Tier 2 ( > ₹8,000 ):** Voice + FaceID/PIN + Mandatory OTP.
- **Tier 3 (Anomaly):** Transactions outside of **Bokaro Plot** coordinates trigger a Tier 2 check regardless of amount.

---

## 💻 Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui.
- **Infrastructure:** Vercel (Edge Functions), Supabase (Postgres + Auth).
- **AI/NLP:** OpenAI GPT-4o-mini (Routing), Claude 3.5 Sonnet (Strategist).
- **Voice:** Deepgram (STT), Vapi (Voice AI), Pindrop (Biometrics).

---

## 📁 Repository Structure

```text
├── agents/              # Agent logic and persona definitions
│   ├── Ash.ts           # Lead Orchestrator
│   ├── Validator.ts     # Security & Biometrics
│   └── Strategist.ts    # Financial Logic
├── components/          # v0-generated high-contrast UI
├── lib/                 # Core Protocol (RAPP) & Geo-fencing
├── docs/                # Post-mortems and Maintenance logs
└── llms.txt             # AI-readable project essence

```

---

## 🚀 Getting Started

1. **Clone & Install:**
```bash
git clone [https://github.com/RunAshAI/pay-platform.git](https://github.com/RunAshAI/pay-platform.git)
npm install

```


2. **Environment Setup:**
Create a `.env.local` and add your keys for OpenAI, Vapi, and your preferred Payment Gateway.
3. **Development:**
```bash
pnpm run dev

```



---

## 📜 Compliance & Ethics

RunAsh AI Pay is built in alignment with the **"AI for All - Jharkhand 2026"** policy. We prioritize data residency within India and utilize "Privacy-First" biometric hashing where raw audio is never stored—only mathematical signatures.

---

## 🤝 Contributing

Please see `CONTRIBUTING.md` for guidelines on adding new Agent Skills or UI components.

**Founder:** Vaibhav Murmu

**Location:** Bokaro, Jharkhand, India

**Vision:** Democratizing high-fidelity AI finance for everyone.

```

---

### Next Step:
**add new "Skills" to the agents?**

```

## API Reliability Update: Stable Envelope and `/api/v1`

Payment APIs are being standardized around a shared response envelope:

- `success`
- `data`
- `error`
- `requestId`
- optional `meta`

The stabilized payment contract is exposed under `/api/v1/payment/*` where supported (for example: `/api/v1/payment/create-intent`). Existing `/api/payment/*` routes remain available for compatibility.

### Migration guidance
- Prefer `/api/v1` routes for all new client/server integrations.
- Use `requestId` for reconciliation and support diagnostics.
- Use `error.code` for deterministic retry/UX logic.
- Continue accepting legacy fields during transition; remove fallbacks only after rollout verification.

## Agent action safety integration

RunAsh agent orchestration now treats payment/account-impacting intents as high-risk actions. These actions are recorded in action audit records and require explicit user confirmation (`confirmedByUser=true`) before approval.

This preserves backward-compatible payment contracts while adding an approval gate at the orchestration layer.


## Settings billing confirmation controls

Billing-impacting settings actions now use explicit confirmation dialogs for cancel-subscription and downgrade-plan mutations. Each dialog describes financial consequences (renewal stop, feature downgrades) and requires a primary confirm action before requests are sent.


## Billing settings contract-first rollout (Settings UI)

The Settings billing experience now ships seven contract-first cards with read-only defaults before mutation paths:
- Upgrade
- Subscription
- Invoice delivery
- Billing method summary
- Usage meters
- Credits balance
- Refer & earn

Status badges now explicitly use: `Active`, `Trial`, `At risk`, `Past due`, and `Available credits` to reflect payment health without changing legacy payload keys (`invoiceEmail`, `autoRechargeEnabled`).

Mutation-capable actions (upgrade and invoice delivery updates) are now gated behind explicit confirmation dialogs in the client before server calls are made.

Server endpoint mapping for billing card actions lives under:
`/api/settings/actions/{upgrade-plan|manage-subscription|invoice-delivery|billing-method-summary|usage-meters|credits-balance|refer-earn}`.

## Settings safety confirmation requirements (2026-02)

To reduce accidental destructive billing/security mutations, RunAsh now enforces an explicit confirmation contract for sensitive settings actions:

- Client requests must include `{ "confirm": true }` for mutation endpoints that disable security controls, revoke access, rotate/delete API credentials, downgrade plans, or cancel subscriptions.
- Server handlers reject requests missing the explicit confirmation flag before running any mutation.
- UI confirmation dialogs now present consequence copy and irreversible warnings for destructive operations so users can complete or retry from the same dialog context.

This preserves backward-compatible response field shapes while hardening mutation intent validation.

## Payment Surface Routes (Current)

RunAsh Pay now exposes a dedicated route map for product navigation:

- `/payment/runash-pay` — primary RunAsh Pay landing/dashboard shell.
- `/payment/startup` — Startup segment journey and quick actions.
- `/payment/business` — Business segment journey and onboarding/support actions.
- `/payment/dashboard` — transaction monitoring and analytics dashboard.
- `/ecommerce/payments` — payment link creation and method management.
- `/payment/subscription` — subscription and billing management.

### User journey references

1. **Create payment link:** `/payment/runash-pay` → `/ecommerce/payments`.
2. **Collect payment:** `/payment/runash-pay#create-intent` (calls `/api/v1/payment/create-intent`).
3. **Manage payout/subscription:** `/payment/runash-pay` or `/payment/business` → `/payment/subscription`.
4. **View analytics:** `/payment/runash-pay` or segment pages → `/payment/dashboard#analytics`.
5. **Onboarding:** `/payment/runash-pay` → `/payment/startup` or `/payment/business`.

Existing entry points (`/payment/dashboard` and `/ecommerce/payments`) include navigation to RunAsh Pay plus key actions (collect payment, manage payout/subscription, and view analytics).

## 🧾 E-commerce Payment Link API (v1)

The e-commerce payments dashboard now reads and writes payment links/methods through server APIs under `/api/v1`.

- `GET /api/v1/payment-links` - list links with analytics (`clicks`, `conversions`, `status`).
- `POST /api/v1/payment-links` - create a payment link.
- `GET /api/v1/payment-links/:id` - fetch a single payment link by id.
- `PUT /api/v1/payment-links/:id` and `PATCH /api/v1/payment-links/:id` - update link details/status/analytics fields.
- `DELETE /api/v1/payment-links/:id` - remove a payment link.
- `GET /api/v1/payment-methods` - list available payment methods.
- `PUT /api/v1/payment-methods/:id` - update method connection state.
- `DELETE /api/v1/payment-methods/:id` - remove a payment method.

Persistence is backed by database tables `ecommerce_payment_links` and `ecommerce_payment_methods` (see `scripts/014-ecommerce-payment-links-methods.sql`).

Compatibility aliases are also available at `/api/payment-links` and `/api/payment-links/:id` so legacy clients can migrate without contract breaks.

Dashboard UX now uses optimistic create/update/delete behavior with rollback on failure, plus 15-second/background visibility refresh so conversions and revenue counters stay in sync with backend analytics.

## Payment backend reliability hardening (implementation update)

RunAsh Pay payment intent/confirmation execution now runs on DB-backed repositories and provider adapters while keeping the existing API response payload shape.

### What changed
- Payment intents are persisted in `payment_intents` with provider IDs, provider event trail, and create idempotency keys.
- Payment confirmations persist transactions in `payment_transactions_v2` with unique `intent_id` and unique confirm idempotency keys.
- Refund records are persisted in `payment_refunds` and linked to transaction IDs for auditability.
- Payment link persistence support is available through `payment_links_v2` repository primitives for payment-flow linkage.
- Provider integration is handled behind a gateway boundary (`lib/services/payment-provider-gateway.ts`) so Stripe/Razorpay-class adapters can be swapped/expanded without changing API contracts.

### Reliability and safety notes
- Transaction amount now comes from the persisted intent amount (no runtime randomization).
- Transaction status transitions are provider-result-driven and appended to provider event history for audit trails.
- Existing `success/data` response shape remains unchanged for `/api/payment/create-intent` and `/api/payment/confirm`.
- Idempotency keys are accepted from body `idempotencyKey` or `x-idempotency-key` header for create/confirm operations.
- When idempotency keys are omitted, create/confirm routes now derive deterministic keys from authenticated scope + request payload to guarantee replay-safe behavior.


## Billing API Contract Stabilization (2026-02)

To improve contract stability for subscription and invoice workflows, RunAsh Pay now includes explicit billing API coverage for:

- `GET /api/billing/plans`
- `GET /api/billing/plans/:id`
- `GET /api/billing/invoices`
- `GET /api/billing/invoices/:id`
- `GET /api/billing/invoices/:id/download`
- `POST /api/billing/subscription/cancel`
- `POST /api/billing/subscription/reactivate`

Long-term aliases are also exposed under `/api/v1/billing/*` for the same flows.

### Compatibility and audit notes

- Existing field names are preserved (`plan_id`, `cancel_at_period_end`, `line_items`, etc.).
- Subscription payloads remain backward compatible while supporting a normalized envelope (`{ subscription: ... }`) for mutating actions.
- Invoice listing returns deterministic pagination metadata (`limit`, `offset`, `total`) for reliable reconciliation.
- Invoice download now resolves via `GET /api/billing/invoices/:id/download`, redirecting to the stored PDF/hosted URL without changing invoice field contracts.
- No sensitive payment method or auth secrets are logged as part of this rollout.

## Auth, authorization, and auditability updates (server routes)

The payment/billing API surface now uses session-based server identity as the canonical auth layer.

### What changed
- `/api/billing/usage` no longer accepts placeholder header identity and now derives user identity from authenticated server session claims.
- Billing and payment routes require authenticated sessions and enforce ownership checks against user/organization context.
- Business vs startup operator/admin route scope checks are enforced through RBAC helper logic.
- Privileged payment/billing actions emit audit records with redacted/sanitized details.

### Backward compatibility notes
- API path and payload contracts remain unchanged for existing billing/payment clients.
- `/api/v1/*` aliases continue to re-export the same handlers.
- Webhook route behavior is unchanged except for continued signature-based verification.


## Payment observability hardening (logging contract)

Payment route error logging is standardized on `lib/api/logging.ts` with structured, redacted events.

### Logging contract (payment flows)
- Emit `event`, `requestId`, `route`, `method`, and safe `details.errorCode`.
- Do not emit raw provider tokens, payer email, card metadata, or authorization credentials.
- Use `requestId` for payment support reconciliation and trace stitching.

### Backward compatibility
- API response fields and payment route signatures remain unchanged.
- This update affects observability output only (sanitized internal logs).

## API Auth & Ownership Enforcement (2026-02)
- Billing and payment APIs now require canonical NextAuth server session identity (JWT/session) and no longer accept header-based placeholder identities for protected operations.
- Payment link and payment method CRUD endpoints now enforce owner/tenant scoping (`owner_user_id` / `owner_organization_id`) before reads or writes.
- Operator APIs require role checks for startup/business/admin scopes via `lib/rbac.ts` role constants.

## Payment protocol orchestration migration notes (v1)

RunAsh Pay now introduces protocol-level orchestration records for payment execution gating.

### Backward compatibility
- Existing create-intent and confirm endpoint payloads are unchanged.
- The protocol contract is versioned under `v1` and additive: no existing field names are renamed.
- High-risk actions (payment/refund/charge/payout/account destructive actions) now require explicit `userConfirmed=true` before execution release.

### DB rollout plan
1. Apply migration: `scripts/sql/2026-02-14_create_payment_protocol_tables.sql`.
2. Deploy services that write protocol events and consensus records.
3. Monitor new tables (`payment_protocol_events`, `payment_consensus_records`) for release/block decisions before enforcing dashboards or external dependencies.

### Phased rollout
- **Phase 1 (observe):** write protocol events while preserving existing execution behavior.
- **Phase 2 (guard):** enforce deterministic policy checks before release for high-risk and consensus-required actions.
- **Phase 3 (enforce):** fail closed when confirmation/consensus/policy checks are not satisfied.

### Rollback
- If incident risk appears, disable protocol enforcement path in service configuration and keep event writes enabled for audit continuity.
- Existing payment APIs continue to function using current intent/transaction repositories.



## Billing usage ingestion reliability update (2026-02)

To support durable AI usage billing and reconciliation, usage ingestion now supports authenticated single and batch event ingestion with idempotency safeguards.

### What changed
- `POST /api/v1/billing/usage` now supports event-style ingestion with `eventId`, token usage, execution time (`deltaMs`), and pricing model payloads.
- `PUT /api/v1/billing/usage` adds authenticated batch ingestion with per-event ingestion/duplicate reporting.
- Usage events persist to `usage_events` with `resolver_id`, `resolver_type`, and arbitrary `metadata` JSON payloads for bring-your-own-resolver attribution.
- Daily and monthly rollups persist in `usage_aggregates` keyed by customer/subscription.
- Delayed ingestion reconciliation is supported through queue-backed retry processing and `eventId` idempotency uniqueness.

### Compatibility and security notes
- Existing legacy usage increment payloads (`metric`/`amount`) remain supported for backward compatibility.
- No payment/auth secrets are logged as part of ingestion handling.
- New ingestion behavior is additive and does not change existing billing route identity requirements.

## Payment API observability update (2026 reliability hardening)

- Billing and payment endpoints now emit correlation headers (`x-request-id`, `x-correlation-id`) and include `requestId` in key response payloads for traceability.
- Error paths were migrated from raw `console.error` statements to structured sanitized logs for payment/billing/auth-adjacent routes.
- Logging redaction now explicitly covers provider/payload/customer key patterns in addition to token/email/payment key detection.
- No payment contract fields were removed; response additions are backward-compatible metadata for auditability.


## 2026 API Reliability hardening

- Canonical payment/billing contracts now live under `/api/v1/payment/*` and `/api/v1/billing/*`.
- Legacy `/api/payment/*` and `/api/billing/*` routes are maintained as compatibility aliases to avoid integration breakage.
- Customer-scoped resources enforce auth-backed ownership checks.
- Payment intents, transactions, subscriptions, invoices, and usage are persisted in DB-backed storage (no in-memory simulation path).

## Tax computation and compliance boundary update (2026-02)

RunAsh AI Pay now includes first-party tax domain persistence and reporting for business-grade reconciliation.

### What changed
- Added tax domain models: `tax_registrations`, `tax_rates`, `tax_calculations`, `tax_line_items`.
- Billing checkout and subscription creation now computes region-aware tax for:
  - **US**: sales tax model (state-aware fallback + configured rates)
  - **India**: GST model (IGST / CGST+SGST fallback + configured rates)
- Invoice webhook ingestion stores tax breakdown with jurisdiction details and links tax records to invoice/payment identifiers.
- Added reporting endpoint `GET /api/v1/payment/reporting` (also available via `/api/payment/reporting`) with:
  - `revenue_summary`
  - `payouts_summary`
  - `tax_liability_by_jurisdiction`

### MOR and compliance boundaries
- RunAsh Pay provides calculation, storage, and reporting capabilities, but does not replace statutory tax filing obligations.
- Merchants retain responsibility for registration validity, return filing, exemptions, and final legal treatment.
- Platform logs and reporting intentionally avoid sensitive auth/payment secrets while preserving tax audit metadata.

## Checkout Link + Vaulted Customer Profile Enhancements (2026-02)

RunAsh AI Pay now includes first-party checkout profile persistence for secure autofill and payment-method vault references:

- Added `checkout_links` with slug-based routing, amount rules (`fixed_amount` or min/max range), product metadata, expiry, and status lifecycle.
- Added `checkout_sessions` to capture customer, selected method reference, and device/browser context for auditability.
- Added `customer_payment_method_vault_refs` to store tokenized provider identifiers only (`provider_token_id`) with zero raw PAN/CVV storage.
- Added `customer_checkout_profiles` for encrypted-at-rest billing/shipping addresses plus default and backup payment method references.

### New APIs

- `GET|PUT /api/v1/payment/profile` → read/update customer billing + shipping profile (encrypted at rest).
- `GET|POST /api/v1/payment/profile/methods` → list/add tokenized payment method references.
- `PATCH|DELETE /api/v1/payment/profile/methods/:id` → switch default/backup method or remove method.
- `POST /api/v1/payment/profile/autofill/authorize` → authorize checkout autofill by checkout link slug, with checkout session creation and context capture.
- `POST /api/v1/payment/checkout-links` → create checkout links with amount-rule validation.

### Security + compatibility notes

- Backward compatibility preserved for existing payment-intent/transaction contracts.
- Address payloads are encrypted before DB persistence (application-layer encryption-at-rest).
- APIs continue using HTTPS-only transport expectations (encryption in transit).
- Logging intentionally avoids sensitive payment/auth data.

## Customer lifecycle analytics and provenance update (2026-02)

### Scope
- Added lifecycle persistence tables: `customer_profiles`, `customer_events`, and `payment_recovery_events`.
- Added dashboard-facing lifecycle aggregates for MRR, ARPU, LTV, churn, failed recovery rate, and cohort conversion.
- Added provenance capture (`source`: `web` | `api` | `agent_action`) for lifecycle and recovery events.

### Backward compatibility and safety
- Existing payment intent, transaction, and billing contracts are preserved.
- New lifecycle APIs and response fields are additive.
- No sensitive payment/auth data is logged; provenance tracks only event origin and actor IDs.

### Operational note
- Lifecycle analytics endpoint: `GET /api/payment/lifecycle`.
- Lifecycle event ingestion endpoint: `POST /api/payment/lifecycle`.

## Stripe webhook reliability hardening (2026-02)

- Billing webhook verification now requires a valid `stripe-signature` header and enforces strict signature tolerance checks before any processing.
- Stripe webhook events are persisted in a durable `webhook_events` table with idempotency on `(provider, event_id)` and lifecycle states: `received`, `processed`, `failed`, `dead_letter`.
- Domain routing is explicit for invoice paid/failed, subscription lifecycle updates, and payout status updates.
- Failed events can be replayed in received-order via admin-protected internal endpoint `POST /api/internal/billing/webhook/replay`.
- Webhook logs use centralized redaction and intentionally exclude raw auth/payment payload details.

## Unified payment pages and live API wiring

The payment routes below now share a unified responsive layout and reusable sections:

- `/payment/runash-pay`
- `/payment/business`
- `/payment/startup`
- `/payment/subscription`
- `/payment/dashboard`

Reusable sections:
- Payment Methods (`GET /api/v1/payment/methods`)
- Checkout Links (`POST /api/v1/payment/checkout-links`)
- Usage Billing (`GET/POST /api/v1/billing/usage`)
- Customer Portal (`POST /api/v1/billing/portal`)
- Tax & Payout Reports (`GET /api/v1/payment/reporting`)

All section actions now call live APIs and expose loading/success/error states with accessible labels and keyboard-friendly form submission.

## Auth & access reliability update (payment APIs)

- Payment/billing endpoints now consistently use server-session-based auth guards.
- Placeholder identity fallbacks (header-only user spoofing patterns) have been removed from billing usage flow ownership.
- Payment operations now include customer-role RBAC support (`customer_admin`, `customer_operator`, `customer_finance`) with required org-scoped session context.
- Payment-method mutation actions are protected with cross-device session integrity verification tied to checkout authorization fingerprints.

## Billing API Reliability Notes (2026-02)

To improve payment UX reliability and reduce client parsing ambiguity, billing contract responses now use a normalized API envelope with backward-compatible legacy fields for subscription and invoice routes.

- Canonical billing contracts are documented in `docs/API_CONTRACTS.md` under **Billing APIs (`/api/billing/*`)**.
- Compatibility fields (`plans`, `subscription`, `invoices`, `invoice`) remain available at the response top level during migration.
- Invoice download supports redirect mode (default) and JSON compatibility mode via `?redirect=false`.

## Payment service persistence and idempotency hardening (2026 update)

- Payment internals now persist and read **payment methods, intents, transactions, and refunds** from repository-backed tables under `lib/repositories/*`.
- `create-intent` and `confirm` now enforce idempotent behavior through stored idempotency keys (`create_idempotency_key` and `confirm_idempotency_key`) to prevent duplicate charges.
- Transaction status is derived from provider confirmation/callback event semantics (`event.type` + provider status), replacing synthetic/randomized status assignment.
- Public response fields are unchanged for API compatibility; only internal persistence and status derivation paths were updated.

## Billing usage ingestion reliability (API)

Billing usage ingestion now supports authenticated single-event and batch-event submission under `/api/billing/usage` (backed by `/api/v1/billing/usage`).

### Supported payloads
- **Single ingestion**: accepts `event_id`/`eventId`, token metrics (`prompt_tokens`, `completion_tokens`, `total_tokens`), `delta_ms`, `resolver`, and `metadata`.
- **Batch ingestion**: accepts `{ "events": [...] }` with the same schema.
- **Cost preview**: accepts `{ "mode": "cost_preview", "events": [...] }` and returns charge projections without persisting events.
- **Current period aggregate**: `GET /api/billing/usage?mode=current_period` returns current-month token/time/charge totals.

### Idempotency and deduplication
- `event_id` is treated as the idempotency key.
- Duplicate ingestion attempts are ignored (`ON CONFLICT DO NOTHING`).
- A deterministic payload hash is persisted to detect duplicate key reuse with mismatched event payload content.

### Backward compatibility
- Legacy usage metric writes (`metric` + `amount`) remain supported.
- Existing API route shape is preserved; enhancements are additive.

## Payment UI route modules (App Router)

The payment hub now exposes a shared core entry plus audience-specific route modules:

- `/payment/runash-pay` → Core entry surface (checkout links, payment methods, subscriptions, analytics, usage, portal, reporting)
- `/payment/startup` → Startup-tailored module set (methods, checkout links, subscriptions, usage, portal)
- `/payment/business` → Business-tailored module set (methods, checkout links, subscriptions, analytics, reporting, portal)

### Live API CTA bindings

All primary CTAs are wired to live contract-first endpoints:

- Payment methods: `GET /api/v1/payment/methods`
- Checkout links: `POST /api/v1/payment/checkout-links`
- Subscription state: `GET /api/v1/billing/subscription`
- Analytics snapshot: `GET /api/v1/analytics`
- Usage billing: `GET/POST /api/v1/billing/usage`
- Billing portal: `POST /api/v1/billing/portal`
- Tax/reporting: `GET /api/v1/payment/reporting`

Navigation links to these routes are exposed from existing payment/ecommerce UI surfaces to streamline onboarding and operations.

## 2026-02 Checkout link + portal lifecycle APIs expansion

Implemented additive APIs and entities for business checkout and portal management:

- Checkout link management now supports full lifecycle actions:
  - `GET /api/v1/payment/checkout-links` (list)
  - `PATCH /api/v1/payment/checkout-links/:id` (update)
  - `PATCH /api/v1/payment/checkout-links/:id` with `{ "action": "disable" | "expire" }`
- Added customer-portal profile API surface:
  - `GET|PUT /api/v1/payment/profile/portal` for billing/shipping details and default/backup method pointers.
  - `GET /api/v1/payment/profile/portal/metrics` for payment/failure/recovery/renewal status metrics.
  - `GET|POST /api/v1/payment/profile/portal/lifecycle` for lifecycle actions (`update_method`, `retry_failed_payment`, `subscription_state_change`).
- Storage remains tokenized-reference only for cards (`provider_token_id`); raw PAN/CVV fields are blocked.
- Added `portal_lifecycle_actions` persistence for auditability of portal actions.

Backward compatibility notes:

- Existing payment profile and checkout link APIs remain available.
- New routes and entities are additive and do not break current field names.

## Webhook durability + operator diagnostics upgrade (2026-02)

- Billing webhook verification now performs strict Stripe signature header validation (`t` + `v1` checks) prior to cryptographic event construction, with configurable tolerance via `BILLING_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS`.
- Event processing remains idempotent by `(provider,event_id)` and now short-circuits already-processed duplicate deliveries.
- Webhook lifecycle persistence continues to use durable event states: `received`, `processed`, `failed`, `dead_letter`.
- Added domain persistence handlers for:
  - Subscription lifecycle events (`customer.subscription.*`)
  - Invoice events (`invoice.created`, `invoice.payment_succeeded`, `invoice.payment_failed`)
  - Payment intent events (`payment_intent.succeeded`, `payment_intent.payment_failed`)
  - Payout events (`payout.*`)
- Operator tooling:
  - `POST /api/internal/billing/webhook/replay` for failed/dead-letter replay
  - `GET /api/internal/billing/webhook/events` for diagnostics listing
  - `POST /api/internal/billing/webhook/events/:eventId/rollback` to reset eligible failed/dead-letter events and trigger replay.
- Reporting enhancements in `GET /api/v1/payment/reporting` now include transaction-level revenue rows, payout visibility rows, and tax breakdown records in addition to existing summaries.
- Security note: webhook and reporting paths continue to avoid logging sensitive payment/auth secrets.


## Authorization hardening update

- Billing usage and payment lifecycle actions bind customer identity to authenticated server session claims; no caller-provided customer identity is trusted for authorization.
- Customer-scoped payment resources require ownership verification against session user/tenant scope before mutation.
- Payment route authorization now supports explicit action-level RBAC classes for finance read access, billing admin actions, and billing operator actions.


## 2026-02 tax modeling and finance visibility update

RunAsh AI Pay now applies product-aware tax computation during checkout and subscription creation using customer location plus product tax classification (`physical_goods`, `digital_services`, `professional_services`).

### What is now persisted
- Jurisdiction-aware tax models and effective rates.
- Tax calculation artifacts for checkout, subscription, invoice, and transaction records.
- Transaction tax line items with tax type, jurisdiction, rate, taxable amount, and tax amount.

### What is now exposed
- Invoice APIs return tax breakdown plus a tax-inclusive `financial_summary` view.
- Payment reporting includes:
  - `revenue_tax_summary`
  - `operations_finance_summary`
  - existing `revenue_summary`, `payouts_summary`, `tax_liability_by_jurisdiction`, `tax_breakdown`

### Compliance responsibility reminder
RunAsh provides tax estimation and reporting support. Customers and finance operators remain responsible for tax registration validation, filing decisions, and legal compliance in their operating jurisdictions.
