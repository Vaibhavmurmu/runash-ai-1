# Codebase Issue Tasks (Targeted Backlog)

_Last verified: 2026-02-24 (UTC)_

## Backlog operating model

### Required fields per item
Every backlog item must include:
- **Owner**
- **Priority** (`P0`/`P1`/`P2`)
- **Status** (`todo`/`in-progress`/`blocked`/`done`)
- **Target release**
- **Risk** (`low`/`medium`/`high`)
- **Affected paths** (direct file/module references)

### Task structure standard
Each backlog item must be split into:
1. **Implementation steps**
2. **Validation steps**

### Closure criteria and evidence format
An item can move to `done` only when all closure criteria are met and evidence is attached.

**Required closure criteria**
- Implementation steps are complete.
- Validation steps are complete.
- Risk + rollback notes are documented.
- Affected docs are updated when behavior/policy changed.

**Evidence format (attach in PR/task update)**
- **Command outputs**: include exact commands and pass/fail results (for example: `npm run lint`, `npm run build`, focused test commands).
- **Changed files**: list touched file paths.
- **Rollback notes**: concise mitigation + rollback procedure for the change.

### Weekly backlog hygiene
- **Cadence**: review this backlog weekly.
- **Action**: archive completed items to keep the active list short and current.
- **Archive location**: move completed entries to `docs/archive/codebase-issue-tasks-archive.md` (create if missing).

## De-duplication campaign status

- [x] Created canonical policy index (`docs/CONTRIBUTOR_POLICY_INDEX.md`).
- [x] Replaced repeated policy text in `AGENTS.md` with canonical doc links.
- [x] Reduced payment docs to payment-domain guidance and removed generic contributor/process policy duplication.
- [x] Added "Last verified" stamps to high-churn governance docs touched in this campaign.

## Superseded sections

- **Task 3 (Documentation discrepancy: `RunAsh_AI_Pay.md` repo structure)** — **Superseded/Completed** by de-duplication work. Repository-structure and generic contributor guidance were removed from payment docs and replaced with canonical links.

---

## 1) Typo fix task — normalize `payment-getways` naming

- **Owner**: Backend
- **Priority**: P1
- **Status**: todo
- **Target release**: Next patch release
- **Risk**: medium
- **Affected paths**:
  - `lib/payment-getways/pay.ts`
  - `lib/payment-gateways/pay.ts`
  - `RunAsh_AI_Pay.md`

**Issue observed**
- The payment gateway module path is misspelled as `lib/payment-getways/pay.ts`.
- Similar typo patterns already exist in `lib/prodct-recommendations.ts`, indicating naming drift risk.

**Implementation steps**
1. Rename `lib/payment-getways/` to `lib/payment-gateways/`.
2. Add a temporary compatibility re-export at the old path to avoid breaking imports.
3. Sweep internal imports and update references to the corrected path.

**Validation steps**
1. Run lint/type checks to confirm no broken imports.
2. Run targeted tests for payment gateway usage paths.
3. Verify old-path compatibility shim resolves correctly during migration window.

**Closure criteria**
- New canonical path uses `payment-gateways`.
- Existing imports continue to work during migration window.
- A follow-up task exists to remove compatibility alias after migration.
- Evidence attached: command outputs, changed files, rollback notes.

**Follow-up checklist (post-migration)**
- [ ] Remove `lib/payment-getways/pay.ts` shim after `payment-getways` imports reach zero and CI guard remains green.

---

## 2) Bug fix task — `BackgroundSync.destroy()` does not detach listeners

- **Owner**: Backend
- **Priority**: P1
- **Status**: todo
- **Target release**: Next patch release
- **Risk**: medium
- **Affected paths**:
  - `lib/background-sync.ts`
  - `lib/background-sync.destroy.test.ts`

**Issue observed**
- `initializeEventListeners()` registers inline arrow functions for `online` and `offline` events.
- `destroy()` calls `removeEventListener()` with *new* inline arrow functions, so listeners are not actually removed.

**Implementation steps**
1. Store listener references as class fields and use the same references in both add/remove operations.
2. Ensure teardown paths consistently unregister listener instances.
3. Add regression coverage for repeated init/destroy cycles.

**Validation steps**
1. Run unit tests for background sync teardown behavior.
2. Run targeted regression test proving listeners are detached after `destroy()`.
3. Optionally run stress-style recreate/destroy loop to verify handlers do not accumulate.

**Closure criteria**
- `destroy()` removes all registered browser event listeners.
- Recreating/destroying `BackgroundSync` repeatedly does not accumulate handlers.
- Evidence attached: command outputs, changed files, rollback notes.

---

## 4) Test improvement task — replace source-text assertions with behavior tests

- **Owner**: Security + Backend
- **Priority**: P2
- **Status**: todo
- **Target release**: Next minor release
- **Risk**: low
- **Affected paths**:
  - `lib/auth-helpers.get-session-check.test.ts`
  - `lib/auth-helpers.ts`
  - `RUNASH-AUTH.md`

**Issue observed**
- `lib/auth-helpers.get-session-check.test.ts` validates behavior using regex against source code text.
- This can pass even if runtime behavior changes, making tests brittle and low-signal.

**Implementation steps**
1. Refactor tests to assert runtime behavior of `getSession`.
2. Cover dependency-override delegation path.
3. Cover fallback-to-shared-auth-accessor path.
4. Keep only a minimal contract check if needed; remove source-regex as primary assurance.

**Validation steps**
1. Run focused auth helper tests.
2. Confirm tests fail on intentional delegation regression.
3. Run lint/build checks to ensure no test/runtime integration breakage.

**Closure criteria**
- Tests fail on delegation regressions even when source formatting changes.
- Coverage includes both dependency-injected and default execution paths.
- Evidence attached: command outputs, changed files, rollback notes.
