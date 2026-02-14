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
2. **Create payment intent:** `/payment/runash-pay#create-intent` (calls `/api/v1/payment/create-intent`).
3. **View transactions:** `/payment/runash-pay` → `/payment/dashboard`.
4. **Manage subscription:** `/payment/runash-pay` → `/payment/subscription`.
5. **Onboarding:** `/payment/runash-pay` → `/payment/startup` or `/payment/business`.

Existing entry points (`/payment/dashboard` and `/ecommerce/payments`) include navigation to the new RunAsh Pay route hierarchy.

## 🧾 E-commerce Payment Link API (v1)

The e-commerce payments dashboard now reads and writes payment links/methods through server APIs under `/api/v1`.

- `GET /api/v1/payment-links` - list links with analytics (`clicks`, `conversions`, `status`).
- `POST /api/v1/payment-links` - create a payment link.
- `PUT /api/v1/payment-links/:id` - update link details/status/analytics fields.
- `DELETE /api/v1/payment-links/:id` - remove a payment link.
- `GET /api/v1/payment-methods` - list available payment methods.
- `PUT /api/v1/payment-methods/:id` - update method connection state.
- `DELETE /api/v1/payment-methods/:id` - remove a payment method.

Persistence is backed by database tables `ecommerce_payment_links` and `ecommerce_payment_methods` (see `scripts/014-ecommerce-payment-links-methods.sql`).

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
