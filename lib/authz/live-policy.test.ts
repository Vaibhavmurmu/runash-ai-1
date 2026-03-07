import test from "node:test"
import assert from "node:assert/strict"

import { evaluateOperationPermission, evaluateTenantQuotas } from "@/lib/authz/live-policy"
import type { TenantQuotaSnapshot } from "@/types/auth"

test("policy denies operations for insufficient role", () => {
  const decision = evaluateOperationPermission(
    {
      userId: "42",
      role: "user",
      tenantId: "user:42",
    },
    "create_stream",
  )

  assert.equal(decision.allowed, false)
  if (!decision.allowed) {
    assert.equal(decision.code, "AUTHZ_PERMISSION_DENIED")
    assert.equal(decision.status, 403)
  }
})

test("policy allows timeline editing for editor role", () => {
  const decision = evaluateOperationPermission(
    {
      userId: "42",
      role: "editor",
      tenantId: "org:9",
    },
    "edit_timeline",
  )

  assert.equal(decision.allowed, true)
})

test("tenant quota blocks generation windows and separates tenants", () => {
  const tenantA: TenantQuotaSnapshot = {
    tenantId: "org:101",
    concurrentLiveSessions: 0,
    generationJobsWindow: 12,
    storageBytes: 10,
    egressBytes: 10,
  }
  const tenantB: TenantQuotaSnapshot = {
    tenantId: "org:202",
    concurrentLiveSessions: 0,
    generationJobsWindow: 2,
    storageBytes: 10,
    egressBytes: 10,
  }

  const limits = {
    concurrentLiveSessions: 2,
    generationJobsPerWindow: 5,
    generationJobsWindowSeconds: 60,
    storageBytesCap: 100,
    egressBytesCap: 100,
  }

  const denied = evaluateTenantQuotas("run_generation", tenantA, limits)
  const allowed = evaluateTenantQuotas("run_generation", tenantB, limits)

  assert.equal(denied.allowed, false)
  if (!denied.allowed) {
    assert.equal(denied.code, "TENANT_QUOTA_GENERATION_WINDOW_EXCEEDED")
  }

  assert.equal(allowed.allowed, true)
})
