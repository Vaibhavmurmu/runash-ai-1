# Codebase Issue Tasks (Targeted Backlog)

## 1) Typo fix task — normalize `payment-getways` naming

**Issue observed**
- The payment gateway module path is misspelled as `lib/payment-getways/pay.ts`.
- Similar typo patterns already exist in `lib/prodct-recommendations.ts`, indicating naming drift risk.

**Task**
- Rename `lib/payment-getways/` to `lib/payment-gateways/`.
- Add a temporary compatibility re-export at the old path to avoid breaking imports.
- Sweep internal imports and update references to the corrected path.

**Why this matters**
- Improves discoverability and consistency for payment-domain modules.
- Reduces future import mistakes and duplication.

**Acceptance criteria**
- New canonical path uses `payment-gateways`.
- Existing imports continue to work during migration window.
- A follow-up task is created to remove compatibility alias after migration.

---

## 2) Bug fix task — `BackgroundSync.destroy()` does not detach listeners

**Issue observed**
- `initializeEventListeners()` registers inline arrow functions for `online` and `offline` events.
- `destroy()` calls `removeEventListener()` with *new* inline arrow functions, so listeners are not actually removed.

**Task**
- Store listener references as class fields and use the same references in both add/remove operations.
- Add a regression test to verify listeners are detached after `destroy()`.

**Why this matters**
- Prevents memory leaks and duplicate sync attempts in long-lived sessions.
- Avoids subtle state bugs after teardown/re-init cycles.

**Acceptance criteria**
- `destroy()` removes all registered browser event listeners.
- Recreating/destroying `BackgroundSync` repeatedly does not accumulate handlers.

---

## 3) Documentation discrepancy task — reconcile `RunAsh_AI_Pay.md` repo structure

**Issue observed**
- `RunAsh_AI_Pay.md` documents an `agents/` directory in the repository structure.
- The repository currently has no top-level `agents/` directory.

**Task**
- Update `RunAsh_AI_Pay.md` to either:
  - reflect the current structure, or
  - explicitly mark the section as roadmap/future-state.
- Add a short “last verified” note for the structure block.

**Why this matters**
- Prevents contributor confusion and onboarding friction.
- Keeps strategic docs aligned with actual code layout.

**Acceptance criteria**
- Directory map in docs matches current repository or is clearly labeled as planned.
- No broken assumptions remain about non-existent top-level folders.

---

## 4) Test improvement task — replace source-text assertions with behavior tests

**Issue observed**
- `lib/auth-helpers.get-session-check.test.ts` validates behavior using regex against source code text.
- This can pass even if runtime behavior changes, making tests brittle and low-signal.

**Task**
- Refactor tests to assert runtime behavior of `getSession`:
  - verifies delegation to dependency override when provided,
  - verifies fallback to shared auth accessor when override is absent,
  - verifies returned session value and call arguments.
- Keep one light contract test if needed, but avoid source-regex as primary assurance.

**Why this matters**
- Behavior tests better protect refactors and catch real regressions.
- Reduces false confidence from implementation-detail matching.

**Acceptance criteria**
- Tests fail on delegation regressions even when source formatting changes.
- Coverage includes both dependency-injected and default execution paths.
