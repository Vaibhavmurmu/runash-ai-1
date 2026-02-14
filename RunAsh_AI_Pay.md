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
