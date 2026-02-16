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

## Relay Agent Link Checkout Skill (Instant Checkout)

- Added Relay skill `initiate_link_checkout` for RunAshChat "buy this"/instant-checkout flows.
- Runtime contract requires:
  - `merchant_id: string`
  - `amount: number` in smallest unit (paise/cents)
  - `currency: "USD" | "INR"` with default enum handling
  - `product_metadata: { item_name, sku, tags }` with `"via RunAshChat"` tag enforced
- Safety gates before external invocation:
  - HITL threshold precheck
  - MFA gate (env-controlled)
  - PII-safe logging (merchant fingerprint hashing)
- External payment API call: `POST https://api.runash.in/v3/pay`
- Runtime input validation now executes before external invocation using JSON schema + zod parsing.
- Structured activity payload returned to Relay includes:
  - `status`
  - `checkout_session_id`
  - `request_id`
  - `next_action`
- Backward compatibility preserved for existing agent tools and API signatures (tool name and API surface unchanged).


## Validator Gate for Instant Checkout (RunAshChat + Stripe Link)

RunAsh AI Link checkout now enforces a middleware validator gate before payment intent/session creation.

- `requiresHitl`: `true` when amount is above **$100 USD-equivalent** (currency-aware via INR/USD normalization) or configured threshold override.
- `requiresMfa`: `true` when INR amount exceeds `800000` paise (₹8,000) or configured override.
- `allowed`: only `true` when required HITL confirmation and MFA checks are satisfied.
- `reasonCodes`: structured machine-readable reasons such as `HITL_CONFIRMATION_REQUIRED` and `MFA_REQUIRED_FOR_HIGH_VALUE_INR`.

Security hardening for payment activity logs:
- Raw PAN/card number/CVV are never persisted.
- Activity/audit logs store only masked card form, e.g. `*4242`.

## RunAshChat Instant Checkout (Link Quick Pay)

RunAshChat buy-intent messages now support an in-chat Link quick-pay experience for instant checkout.

- Renderer integration: assistant messages can include a `metadata.linkQuickPay` payload.
- UI label: `Pay with Link *{last4}` for continuity with saved Link instruments.
- Status lifecycle: `idle` → `processing` → `success | failed`.
- Eligibility signal: digital products tagged with `digital` and marked as Link-eligible show a `Sold through Link` badge.
- Safety posture: no sensitive payment/auth fields are logged in the UI flow.

This preserves existing checkout contracts and only augments chat rendering/metadata for backward-compatible payment UX.

## Checkout execution fallback sequencing update (2026-02)

Payment confirmation now executes deterministic method fallback for one checkout action while preserving existing route contracts.

### Execution behavior
- Attempt 1 always uses `default_payment_method`.
- If attempt 1 fails with retryable/default-method failure codes, attempt 2 automatically uses `backup_payment_method`.
- Both attempts are persisted into the transaction timeline with explicit `attemptIndex` and `reason` for auditability.
- A single confirm idempotency key is reused for all attempts inside the same checkout action.

### Response fields
The confirm response now includes additive fields:
- `attemptedMethods`: ordered list of method attempts.
- `fallbackUsed`: boolean indicating whether backup fallback executed.
- `finalStatus`: final transaction status after fallback resolution.

### Rollback and compatibility
- Existing transaction fields and endpoint paths are unchanged.
- This rollout is additive and backward compatible; clients can ignore the new fields.

## Tax preview + confirmation gate for RunAshChat Instant Checkout

RunAshChat Instant Checkout now enforces a tax-preview-first payment sequence for Relay → Stripe Link flows:

1. `checkout_preview` computes and returns a tax preview object before final confirmation is accepted.
2. Preview includes:
   - `subtotal`
   - `gstVatAmount`
   - `totalPayable`
3. Final charge is blocked unless both conditions are true:
   - `preview_displayed=true`
   - `user_confirmation_after_preview=true`
4. Activity summaries include tax details (`label`, `ratePercent`, `amount`, `country/region`, `totalPayable`).
5. Final receipt payload now includes tax-aware totals (`subtotal`, `taxAmount`, `totalPayable`, `taxLabel`, `taxRatePercent`, `currency`).

This change preserves existing checkout contracts while adding a mandatory audit-friendly confirmation step for payment reliability.

## Data residency + edge routing policy for Instant Checkout

RunAshChat Instant Checkout now applies a deterministic routing policy before invoking `POST https://api.runash.in/v3/pay`.

### Routing decision model
- A payment edge router resolves traffic to `IN_EDGE` or `US_EDGE`.
- Routing uses merchant/customer regional hints (`merchant_region`, `country`) with India-first handling for India-linked flows.
- The transaction context now includes:
  - `regionRoute`: `IN_EDGE | US_EDGE`
  - `residencyPolicy`: `IN_DATA_RESIDENCY | US_DATA_RESIDENCY`

### Outbound contract safety
- Outbound payment calls include only safe residency metadata:
  - Header: `X-RunAsh-Region-Route`
  - Header: `X-RunAsh-Residency-Policy`
  - Body metadata: `routing_metadata` (`regionRoute`, `residencyPolicy`, normalized merchant/customer region codes)
- No sensitive payment instrument data is added as part of routing metadata.

### Compliance-safe audit behavior
- Instant checkout emits compliance-safe audit records for routing and validator outcomes.
- Logs include merchant fingerprint (hashed), route, policy, amount/currency, and validator status.
- Raw sensitive payment/auth data is not logged.

### Backward compatibility
- Existing API signatures and payment flow contracts are preserved.
- Routing and residency fields are additive in internal transaction context and agent activity summary.

## 2026-02 Reliability Extension — Checkout Attempts, Usage Ingestion, Reporting Trail

Implemented for RunAshChat Instant Checkout + Stripe Link reliability:

- Added checkout attempt/result persistence model for per-session attempt outcomes (`authorized|completed|failed|expired`) with result code/message and metadata trail.
- Added customer portal metrics expansion to include checkout attempt analytics (total/completed/failed/expired, success rate, attempts/session).
- Added explicit usage ingestion APIs for manual and batch modes at `/api/v1/payment/usage/ingest` supporting custom metadata.
- Extended reporting transaction payloads with financial reliability fields:
  - `estimatedTaxAmount`
  - `payoutEligibleAmount`
  - `metadata`
  - `transactionTrail` (provider event trail for auditability)
- Dashboard components now surface checkout attempt KPIs and reporting finance highlights.

Backward compatibility notes:
- Existing billing/payment/profile API signatures are preserved.
- New fields are additive only.

Rollback notes:
- Revert service/API/UI changes in this PR and keep previous reporting payload shape.
- Keep database additive tables; they are isolated and non-breaking.

## Relay Instant Checkout safety gate (2026-02)

RunAshChat "Instant Checkout" now enforces a deterministic Relay safety middleware before Link checkout execution:

- Middleware enforcement layer: `lib/payments/validator-gate.ts` (built on `lib/payments/validator-safety-gate.ts`).
- Middleware is enforced in both API execution paths (`/api/v1/payment/create-intent`, `/api/v1/billing/checkout`) and Relay agent tool execution path (`services/agent-orchestration-service.ts` + `lib/skills/link-checkout-skill.ts`).
- Policy decision contract returned by Relay tooling:
  - `allowed`
  - `requiresHitl`
  - `requiresMfa`
  - `reasonCodes`
  - `requires_hitl` (backward-compatible alias)
  - `requires_mfa` (backward-compatible alias)
  - `reason_codes` (backward-compatible alias)
- HITL rule: USD-equivalent amount above **$100.00** requires explicit human confirmation before checkout execution.
- MFA rule: INR-equivalent amount above **₹8,000** (`800000` paise) requires MFA verification before confirmation.
- Currency normalization is now applied for cross-currency threshold checks, so INR and USD amounts are evaluated consistently.
- Payment activity/tool lineage logging now sanitizes card-like values to masked format (for example `*4242`) and redacts CVV/security codes.

### Risk + rollback notes

- **Risk level:** medium (may block high-value checkout attempts that previously proceeded without HITL/MFA flags).
- **Rollback:** revert validator middleware integration in `lib/payments/validator-gate.ts`, API payment routes, and `services/agent-orchestration-service.ts`, then redeploy.

## RunAshChat Instant Checkout (Stripe Link bridge)

RunAshChat now supports an in-thread Link instant-checkout CTA for eligible product cards so users can complete "buy this" style intents without leaving chat context.

### UI/UX behavior contract

- Primary action label remains `Pay with Link *{last4}` for backward-compatible recognition in payment QA and support playbooks.
- Button lifecycle is explicit: `idle` → `processing` → (`success` | `failed`).
- Failed attempts stay recoverable in place (retry from the same control) so the Relay Agent can re-attempt Link checkout once authorization becomes available.
- Eligible digital products render a `Sold through Link` badge to indicate Link-supported fulfillment.
- Accessibility hardening: disabled state during processing/success, live status messaging, and loading affordances for screen-reader users.

### Reliability notes

- No payment payload field names or API signatures are changed by this UI update.
- This change is presentation/state-management only and remains compatible with existing `/api/payment/*` and `/api/v1/payment/*` flows.

## Link Instant Checkout Reliability (Relay → Stripe Link)

RunAshChat Link checkout now uses a reliability-first payment orchestration path for natural-language intents such as **"buy this"**:

- Primary attempt always starts with `stripe_link` on `https://api.runash.in/v3/pay`.
- If the first attempt fails with a retryable condition (network/timeout/rate-limit/upstream transient), the orchestrator automatically retries once with `backup_payment_method` when provided.
- Both primary and fallback attempts reuse the same `idempotency_key` and are persisted with attempt metadata for reconciliation and auditability.
- Unified response fields include:
  - `fallback_used`
  - `attempted_methods`
  - `final_status`
  - `attempt_timeline` (`method`, `reason`, `status`, `timestamp`)
  - additive aliases `fallbackUsed`, `attemptedMethods`, and `attemptTimeline` for Relay/client compatibility
- Primary attempt selection now honors optional `default_payment_method` (falls back to `stripe_link` if omitted); retryable failures automatically attempt `backup_payment_method` once.
- One idempotency key is reused for all attempts in a single checkout action (`Idempotency-Key` header + `idempotency_key` body) to prevent duplicate charges.
- Attempt-level failures now expose only safe error codes (`rate_limited`, `timeout`, `temporarily_unavailable`, `network_error`, `payment_declined`, `authentication_required`, `invalid_request`, `checkout_failed`) to avoid leaking provider-internal details.
- Sensitive payment payload fields must remain redacted in logs; checkout orchestration avoids logging raw payment instrument details.
- RunAshChat quick-pay UI now surfaces the attempt timeline so users/operators can see primary vs fallback routing outcomes in-chat without exposing sensitive payment data.

## Instant Checkout Tax Preview and Confirmation Gate

RunAshChat Instant Checkout now enforces a tax-preview confirmation step before final charge execution:

- Tax estimation is computed by `lib/payments/tax-preview.ts` with:
- Tax estimation normalizes INR/USD minor units (paise/cents) into currency major units before computing preview totals.
  - `india_gst` mode for INR/India GST flows
  - `sales_tax` (US states) and `vat` modes for USD-region flows
- The checkout preview card includes **subtotal, tax, and total** so users can review the complete payable amount.
- Final Link charge is blocked until user confirms **after** tax preview.
- Tax line items are persisted in transaction metadata for reporting and auditability.
- Persisted tax metadata now includes explicit line-item tuples (`type`, `label`, `jurisdiction`, `rate_percent`, `amount`) per checkout attempt for reconciliation exports.

This rollout is backward compatible with existing checkout contracts and keeps sensitive payment/auth values out of logs.

## Edge routing policy + compliance profile metadata (2026-02)

RunAsh AI Pay now enforces a dedicated payment routing policy layer (`lib/payments/edge-routing-policy.ts`) for outbound checkout/subscription/portal Stripe requests.

- Routing decision is deterministic by normalized merchant/customer region:
  - India merchant/customer region (`IN`, `IND`, `IN-*`, `APAC_IN`) => `IN_EDGE` + `IN_RBI_PROFILE`
  - Otherwise => `US_EDGE` + `US_STRIPE_PROFILE`
- Payment metadata now includes route context keys:
  - `region_route`
  - `residency_policy`
  - `compliance_profile`
- Intent metadata also carries a `payment_context` object with `{ regionRoute, residencyPolicy }` for downstream orchestration and analytics.
- Route decisions are audit logged with a structured envelope containing:
  - `requestId`
  - route decision payload (`regionRoute`, `residencyPolicy`, `complianceProfile`, `reason`)
  - sanitized metadata only (no sensitive payment/auth values)
- Outbound Stripe/provider payment calls now receive only sanitized metadata fields; raw payment instruments/auth artifacts are excluded from provider-bound metadata.
- Outbound Stripe payment calls in billing flows now execute after policy resolution and route-audit capture.

Backward compatibility:
- Existing API signatures/response contracts are unchanged.
- Route/compliance fields are additive metadata for compliance observability.

## 2026-02 Reliability Update: Instant Checkout Controls & Analytics

RunAsh AI Link + Relay-to-Stripe Link flows now expose customer profile controls and reliability analytics APIs for safe natural-language checkout actions (e.g., "buy this").

### New profile controls APIs
- `GET /api/v1/payment/profile/controls`
  - Returns `defaultPaymentMethodId`, `backupPaymentMethodId`, plus billing history and retry summaries.
- `PUT /api/v1/payment/profile/controls`
  - Updates default/backup payment method assignments.

### New analytics summary APIs
- `GET /api/v1/payment/analytics/summary`
- `GET /api/payment/analytics/summary` (compat mirror)

Summary payload includes:
- checkout conversion (`attempted`, `completed`, `conversionRatePercent`)
- failed payment recovery (`failedAttempts`, `recoveredAfterRetry`, `recoveryRatePercent`)
- fallback usage (`transactionsWithFallback`, `fallbackUsageRatePercent`)
- revenue/tax/payout summaries (`revenueTaxSummary`, `payoutSummary`, `operationsSummary`)

### Usage-based billing hooks
`POST /api/v1/payment/create-intent` now accepts optional `usageHook` payload with:
- `eventId`
- `promptTokens`
- `completionTokens`
- `deltaMs`
- `metadata`
- `pricingModel`

When supplied, usage is ingested alongside payment intent creation for auditability.

### Security and authorization
Profile and analytics endpoints enforce billing-role checks and customer organization scope checks. Sensitive payment/auth data remains tokenized only (no PAN/CVV logging).

## Relay Instant Checkout contract update (RunAshChat)

RunAshChat instant checkout (`initiate_link_checkout`) now enforces explicit runtime input validation before Link execution and returns structured validation diagnostics for agent UX remediation.

### Structured validation output
- `status: "validation_failed"` for invalid payloads.
- `validation_issues: [{ path, message }]` to support deterministic prompt repair/retry.
- Currency validation remains constrained to `INR | USD`, with default `USD` when omitted.

### Compatibility note
This update is additive and preserves existing payment flow field names and Relay tool routing contracts.

## 2026-02 RunAshChat AI Link Instant Checkout UX Update

### What changed
- Added a dedicated `LinkQuickPayButton` chat component for Link-powered instant checkout cards in RunAshChat.
- CTA copy is now standardized as `Pay with Link *{last4}`.
- Checkout UI now follows an explicit state machine: `idle -> processing -> success | failed`.
- Eligible digital products now display a `Sold through Link` badge for clear merchandising context.
- Added responsive checkout layout behavior (1-column on mobile, 2-column on desktop) to keep totals and actions readable.
- Tool execution wiring now exposes failure details and a retry affordance without changing checkout API contracts.

### Backward compatibility and safety
- Existing relay tool name (`initiate_link_checkout`) and payload field names are preserved.
- Added UX behavior is contract-safe and additive; no payment field was renamed or removed.
- Error copy avoids sensitive payment/auth logging and only surfaces actionable, user-safe messages.

### Risk and rollback
- **Risk level:** Low to medium (client-side checkout experience + retry behavior).
- **Rollback:** Revert chat Link quick-pay component wiring in `components/chat/chat-message.tsx` and `components/chat/link-quick-pay-button.tsx`.

## 2026-02 Instant Checkout Reliability Expansion (Profile + Analytics + Reporting)

### New profile management APIs
- `GET|PUT /api/v1/payment/profile`
  - Supports `billingDetails` in addition to billing/shipping addresses.
  - Preserves existing `defaultPaymentMethodId` and `backupPaymentMethodId` fields.
- `GET|PUT /api/v1/payment/profile/billing-details`
  - Dedicated billing-detail management endpoint for customer portal/profile workflows.
- `GET|PUT /api/v1/payment/profile/controls`
  - Continues default/backup payment method control and billing history/retry visibility.

### New analytics endpoints
- `GET /api/v1/payment/analytics/checkout-conversion`
- `GET /api/v1/payment/analytics/payment-failures`
- `GET /api/v1/payment/analytics/fallback-usage`
- `GET /api/v1/payment/analytics/revenue-payout-tax`
- Existing `GET /api/v1/payment/analytics/summary` now also includes `checkoutAttemptFinancialSummary`.

### Checkout-attempt reporting metadata
- `POST /api/v1/payment/checkout-attempts` now normalizes additive `metadata.reporting` fields:
  - `grossAmount`, `netAmount`, `processingFeeAmount`, `taxAmount`, `payoutAmount`, `taxWithheldAmount`
  - optional context keys: `exchangeRate`, `settlementCurrency`, `taxJurisdiction`, `payoutSchedule`
- Added aggregation support for attempt-level finance reporting via service-level summary helpers.

### Dashboard + customer portal visibility
- Payment analytics UI now loads dedicated endpoint slices (conversion, failures/recovery, fallback, revenue/payout/tax).
- Customer portal UI now surfaces billing-details payloads and financial-attempt aggregates with portal metrics.

### Compatibility + security
- All changes are additive and backward compatible; existing field names/contracts remain valid.
- Sensitive card/auth data remains prohibited from logs/storage; tokenized references only.

## RunAsh Pay dashboard data and action APIs (latest)

The `/payment/runash-pay` surface now uses real server-backed APIs for wallet summary and transaction history:

- `GET /api/v1/payment/summary` – returns current balance + headline payment totals.
- `GET /api/v1/payment/transactions?limit=<n>&page=<n>&status=<...>&query=<...>` – paginated, filterable transaction list.

It also includes mutation contracts for request and bill operations used by Instant Checkout support flows:

- `GET /api/v1/payment/requests`
- `POST /api/v1/payment/requests`
- `PATCH /api/v1/payment/requests/:id`
- `GET /api/v1/payment/bill-payments`
- `POST /api/v1/payment/bill-payments`
- `PATCH /api/v1/payment/bill-payments/:id`

Client behavior now uses optimistic UI updates with rollback on mutation failures for payment requests and bill payments, and refresh now performs real API refetch instead of timeout simulation.

## 2026-02 RunAshChat Instant Checkout intent + activity payload update

RunAshChat Relay integration now formalizes natural-language checkout intent mapping and structured activity payload delivery for Link checkout.

### Relay tool contract updates
- `initiate_link_checkout` parameter schema now explicitly requires:
  - `merchant_id: string`
  - `amount: number` (paise/cents)
  - `currency: "INR" | "USD"`
  - `product_metadata: { item_name, sku, tags }` where tags include `"via RunAshChat"`
- Existing field names and tool name are preserved; this is additive/strictness alignment for safer invocation.

### Intent phrase mapping
- RunAshChat now maps buy-intent phrases to Link checkout tool invocation, including:
  - `buy this`
  - `confirm purchase`
  - `pay now`

### Structured chat activity summary
- Relay checkout responses now include `activity_summary_payload` for deterministic chat UX rendering:
  - `status`
  - `checkoutId`
  - `taxBreakdown`
  - `nextAction`
- Tax breakdown includes subtotal/tax/total, currency, label, rate, jurisdiction context, and line items for audit-friendly display.

### Risk and rollback
- **Risk level:** Low (contract additive + UI mapping updates).
- **Rollback:** Revert `lib/agent-tools/initiate-link-checkout.ts`, `app/chat/page.tsx`, and `types/runash-chat.ts` to previous revision.


## Instant Checkout Tax Preview & Capture Safeguards (RunAshChat)

RunAshChat Instant Checkout now applies a deterministic tax estimation and confirmation gate before final Link capture:

- `lib/payments/tax-estimator.ts` computes `subtotal`, GST/VAT estimate, and `totalPayable` for confirmation UX and payment handoff.
- RunAshChat renders this tax preview (subtotal + tax + total) in the checkout confirmation step so users can review exact payable totals before charge execution.
- Final capture remains blocked until explicit post-preview confirmation (`preview_displayed=true` and `user_confirmation_after_preview=true`).
- Tax line items are persisted in transaction metadata (`tax_line_items` and `tax_reporting`) to support finance reporting and invoice export pipelines.

Backward-compatibility notes:
- Existing payment API fields and signatures remain unchanged.
- The preview/confirmation gate adds validation behavior without changing existing request field names.


## 2026-02 Portal expansion: methods CRUD, subscriptions, invoices/receipts, and finance visibility

### New customer portal pages
- Added dedicated payment portal routes for:
  - `/payment/portal`
  - `/payment/methods`
  - `/payment/billing-profile`
  - `/payment/subscriptions`
  - `/payment/invoices`
- These pages surface method role controls (default/backup), billing profile updates, subscription recovery actions, and invoice visibility.

### Payment/profile API additions
- Extended method CRUD scope with single-resource operations:
  - `GET /api/v1/payment/profile/methods/:id`
  - `PUT /api/v1/payment/profile/methods/:id`
  - existing `PATCH /api/v1/payment/profile/methods/:id` retained for role switching
  - existing `DELETE /api/v1/payment/profile/methods/:id` retained
- Added failed payment retry trigger endpoint:
  - `POST /api/v1/payment/profile/portal/retry-failed-payment`
- Added invoice receipt retrieval alias endpoint:
  - `GET /api/v1/billing/invoices/:id/receipt`

### Analytics endpoint coverage
- Added churn-risk visibility endpoint:
  - `GET /api/v1/payment/analytics/churn`
- Added MRR/revenue trend endpoint:
  - `GET /api/v1/payment/analytics/mrr-revenue`
- Added payout and tax visibility endpoint:
  - `GET /api/v1/payment/analytics/payout-tax-visibility`

### Backward compatibility + security
- Existing API field names and routes remain intact; new endpoints are additive.
- No raw PAN/CVV logging or storage introduced; tokenized provider references remain enforced.

### Risk + rollback
- **Risk:** Medium (expanded portal/API surface).
- **Rollback:** Revert newly added `payment/portal` pages and new `/api/v1/payment/analytics/*`, `/api/v1/payment/profile/portal/retry-failed-payment`, and `/api/v1/billing/invoices/:id/receipt` routes.

## 2026-02 Reliability & Compliance Hardening Update

### DB-backed billing entities (authoritative storage)
RunAsh AI Pay now relies on persistent database-backed entities for all critical billing workflow objects:
- payment intents
- transactions
- checkout links
- usage events (single + batch ingestion)
- webhook events (including dead-letter records)
- tax line items

### Deterministic checkout/payment execution
Payment execution and checkout-link flows were hardened to remove random/in-memory outcomes. All attempt outcomes are now persisted and replay-safe so retries and reconciliation produce deterministic states.

### Webhook idempotency, retries, and dead-lettering
Billing webhook processing now uses:
- provider+event id uniqueness for idempotency,
- signature verification and tolerance checks,
- retry-safe claim/processing semantics,
- dead-letter tracking for repeatedly failing events.

### Sensitive billing/profile data policy
Billing profile details remain encrypted at rest. Production now requires an explicit encryption key via environment configuration (`CHECKOUT_PROFILE_ENCRYPTION_KEY` or approved auth secret fallback) and disallows weak implicit defaults.

## RunAsh Pay Dashboard UI reliability baseline (2026-02)

To support Instant Checkout operations in RunAshChat and Stripe Link relay monitoring, the dashboard now follows a reusable UI primitive system:

- **Reusable primitives:** shared header, dashboard card shell, quick actions, transaction row, and bottom navigation components.
- **Responsive standards:** mobile-first single-column stack, with desktop two-column sections for payment request and bill workflows.
- **Consistency layer:** unified spacing and typography, empty states for no-data results, and skeleton rows for loading transaction history.
- **Accessibility hardening:** keyboard-focusable rows, explicit ARIA labels on key controls, focus-visible states, and contrast-safe muted/foreground pairings.

### Visual QA checklist (payment-critical components)

- [ ] Header balance card updates correctly on refresh and announces loading/value changes.
- [ ] Quick action buttons are keyboard reachable in tab order and route to the expected flows.
- [ ] Transaction list shows skeleton rows while loading and empty state messaging when no records are returned.
- [ ] Transaction rows show amount, timestamp, status badge, and visible focus ring when tabbed.
- [ ] Payment request and bill payment forms preserve legibility, spacing, and action contrast on mobile and desktop.
- [ ] Bottom navigation remains reachable and readable on narrow screens without clipping.
