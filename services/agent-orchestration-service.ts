import { createHash, randomUUID } from "crypto"

import type {
  ConsensusVerification,
  ExecutionRelease,
  PaymentIntentLock,
  ProtocolDecision,
  ProtocolError,
} from "@/lib/agentic-protocol"
import { createPaymentConsensusRecord, createPaymentProtocolEvent } from "@/lib/repositories/payment-protocol-events"

import {
  completeToolCallLineage,
  createToolCallLineage,
  createToolResult,
  pruneExpiredAgentRecords,
} from "@/lib/repositories/agent-orchestration"
import { relayAgentSkillModules, type RelayAgentTool } from "@/lib/skills/relay-tool-registry"
import { logApiEvent } from "@/lib/api/logging"
import { estimateTaxPreview } from "@/lib/payments/tax-estimator"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import { searchProductsWithProviders } from "@/services/web-search-service"

export type SupportedTool = RelayAgentTool

export type ToolExecutionContext = {
  sessionId: string
  messageId: string
  tenantId: string
  correlationId?: string
}

export type ToolExecutionResult = {
  tool: SupportedTool
  result: Record<string, unknown>
  fromCache: boolean
}

export type ProtocolOrchestrationInput = {
  intentId: string
  actionType: string
  actionPayload: Record<string, unknown>
  requestedBy: string
  userConfirmed: boolean
  verifierSet: string[]
  approvals: string[]
}

export type ProtocolOrchestrationResult = {
  decision: ProtocolDecision
  intentLock: PaymentIntentLock
  consensusVerification?: ConsensusVerification
  release?: ExecutionRelease
  error?: ProtocolError
}

const TOOL_TIMEOUT_MS = Number(process.env.RUNASH_AGENT_TOOL_TIMEOUT_MS ?? "7000")
const TOOL_RETRY_COUNT = Number(process.env.RUNASH_AGENT_TOOL_RETRY_COUNT ?? "2")
const catalogCache = new Map<string, { expiresAt: number; value: Record<string, unknown> }>()
const userThrottles = new Map<string, { count: number; windowStart: number }>()

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getToolCacheKey(tool: SupportedTool, payload: Record<string, unknown>) {
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex")
  return `${tool}:${digest}`
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`tool_timeout_${timeoutMs}ms`)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

async function executeCatalogLookup(payload: Record<string, unknown>) {
  const query = String(payload.query ?? "").trim().toLowerCase()
  await wait(120)

  return {
    query,
    items: [
      { sku: "ORG-QUINOA-1", name: "Organic Quinoa", score: 0.96 },
      { sku: "ORG-AVO-2", name: "Organic Avocado", score: 0.91 },
    ],
  }
}

async function executeInventoryHealth(payload: Record<string, unknown>) {
  await wait(100)
  return {
    warehouse: String(payload.warehouse ?? "default"),
    lowStockSkus: ["ORG-QUINOA-1", "BAG-REUSE-5"],
    generatedAt: new Date().toISOString(),
  }
}

async function executeCheckoutPreview(payload: Record<string, unknown>) {
  await wait(110)
  const lineItems = Array.isArray(payload.items) ? payload.items.length : 0
  const amount = typeof payload.amount === "number" ? payload.amount : 42.5
  const currency = typeof payload.currency === "string" ? payload.currency : "USD"
  const taxPreview = estimateTaxPreview({
    country: typeof payload.country === "string" ? payload.country : "US",
    region: typeof payload.region === "string" ? payload.region : null,
    amount,
    currency,
    lineItemMetadata:
      payload.line_item_metadata && typeof payload.line_item_metadata === "object"
        ? (payload.line_item_metadata as { taxCode?: string; category?: string; tags?: string[] })
        : undefined,
  })

  return {
    lineItems,
    estimatedTotal: taxPreview.totalPayable,
    preview: {
      subtotal: taxPreview.subtotal,
      gstVatAmount: taxPreview.gstVatAmount,
      totalPayable: taxPreview.totalPayable,
      taxLabel: taxPreview.taxLabel,
      taxRatePercent: taxPreview.taxRatePercent,
      country: taxPreview.country,
      region: taxPreview.region,
      currency: taxPreview.currency,
      previewDisplayedAt: new Date().toISOString(),
    },
    warnings: lineItems > 8 ? ["Large cart may require split shipment"] : [],
  }
}


async function executeWebSearch(payload: Record<string, unknown>) {
  const query = String(payload.query ?? "").trim()
  const results = await searchProductsWithProviders(query)
  return {
    query,
    results,
    provider: results[0]?.source ?? "fallback",
    generatedAt: new Date().toISOString(),
  }
}

async function executeInitiateLinkCheckout(payload: Record<string, unknown>) {
  const amount = Number(payload.amount)
  const currency = String(payload.currency ?? "USD")
  const validatorGate = enforcePaymentValidatorMiddleware({
    amountMinor: Number.isFinite(amount) ? Math.round(amount) : 0,
    currency,
    humanConfirmed:
      typeof payload.human_confirmed === "boolean"
        ? payload.human_confirmed
        : typeof payload.user_confirmation_after_preview === "boolean"
          ? payload.user_confirmation_after_preview
          : false,
    mfaVerified: typeof payload.mfa_verified === "boolean" ? payload.mfa_verified : false,
  })

  if (!validatorGate.allowed) {
    return {
      status: "requires_manual_review",
      blockedReason: "validator_gate_blocked",
      validatorDecision: validatorGate.decision,
      validatorGate,
      fallbackPath: "manual_review_queue",
    }
  }

  const result = await relayAgentSkillModules.initiate_link_checkout.execute(payload)
  return {
    ...result,
    validatorGate,
  }
}

function sanitizeToolPayloadForLineage(tool: SupportedTool, payload: Record<string, unknown>) {
  if (tool === "initiate_link_checkout") {
    return sanitizePaymentActivityDetails(payload)
  }

  return payload
}

function isHighRiskAction(actionType: string, actionPayload: Record<string, unknown>) {
  const combined = `${actionType}:${JSON.stringify(actionPayload)}`.toLowerCase()
  return /(payment|refund|charge|subscription|account|delete|payout|transfer)/.test(combined)
}

function hasPromptInjection(content: string) {
  return /(ignore previous|reveal system prompt|bypass|disable safety|print secrets|exfiltrate)/i.test(content)
}

function sanitizeUserInput(input: string) {
  return input.replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD]").slice(0, 5000)
}

function makeProtocolId(prefix: string) {
  return `${prefix}-${randomUUID().replace(/-/g, "")}`
}

function getRiskLevel(actionType: string, payload: Record<string, unknown>): PaymentIntentLock["riskLevel"] {
  if (isHighRiskAction(actionType, payload)) return "high"
  if (/update|write|change|checkout/i.test(actionType)) return "medium"
  return "low"
}

function runDeterministicPolicyChecks(input: {
  actionType: string
  payload: Record<string, unknown>
  approvals: string[]
  verifierSet: string[]
}) {
  const checks = [
    {
      checkId: "policy.no_prompt_injection",
      passed: !hasPromptInjection(JSON.stringify(input.payload)),
      reason: "payload contains injection markers",
    },
    {
      checkId: "policy.min_consensus",
      passed: input.approvals.length > 0 && input.approvals.length <= input.verifierSet.length,
      reason: "consensus approvals are invalid",
    },
    {
      checkId: "policy.action_supported",
      passed: input.actionType.trim().length > 0,
      reason: "action type is required",
    },
  ]

  return checks.map((check) => ({ checkId: check.checkId, passed: check.passed, reason: check.passed ? undefined : check.reason }))
}

export async function orchestrateProtocolRelease(input: ProtocolOrchestrationInput): Promise<ProtocolOrchestrationResult> {
  const riskLevel = getRiskLevel(input.actionType, input.actionPayload)
  const lock: PaymentIntentLock = {
    protocolVersion: "v1",
    intentId: input.intentId,
    lockId: makeProtocolId("lock"),
    actionType: input.actionType,
    riskLevel,
    requiredConfirmations: riskLevel === "high" ? 1 : 0,
    metadata: {
      requestedBy: input.requestedBy,
    },
    createdAt: new Date().toISOString(),
  }

  await createPaymentProtocolEvent({
    id: makeProtocolId("ppe"),
    intentId: lock.intentId,
    lockId: lock.lockId,
    eventType: "intent_locked",
    eventPayload: lock,
  })

  if (riskLevel === "high" && !input.userConfirmed) {
    const error: ProtocolError = {
      code: "USER_CONFIRMATION_REQUIRED",
      message: "Explicit user confirmation is required for high-risk payment actions.",
      details: { intentId: input.intentId, actionType: input.actionType },
    }

    await createPaymentProtocolEvent({
      id: makeProtocolId("ppe"),
      intentId: lock.intentId,
      lockId: lock.lockId,
      eventType: "confirmation_required",
      eventPayload: { error },
    })

    return { decision: "requires_confirmation", intentLock: lock, error }
  }

  const deterministicChecks = runDeterministicPolicyChecks({
    actionType: input.actionType,
    payload: input.actionPayload,
    approvals: input.approvals,
    verifierSet: input.verifierSet,
  })

  const failedChecks = deterministicChecks.filter((check) => !check.passed)

  const consensus: ConsensusVerification = {
    protocolVersion: "v1",
    intentId: lock.intentId,
    lockId: lock.lockId,
    verifierSet: input.verifierSet,
    approvals: input.approvals,
    deterministicChecks,
    verifiedAt: new Date().toISOString(),
  }

  await createPaymentConsensusRecord({
    id: makeProtocolId("pcr"),
    intentId: consensus.intentId,
    lockId: consensus.lockId,
    verifierSet: consensus.verifierSet,
    approvals: consensus.approvals,
    deterministicChecks,
  })

  await createPaymentProtocolEvent({
    id: makeProtocolId("ppe"),
    intentId: consensus.intentId,
    lockId: consensus.lockId,
    eventType: "consensus_verified",
    eventPayload: consensus,
  })

  if (failedChecks.length > 0) {
    const error: ProtocolError = {
      code: "POLICY_CHECK_FAILED",
      message: "Deterministic policy checks failed. Release is blocked.",
      details: { failedChecks },
    }

    await createPaymentProtocolEvent({
      id: makeProtocolId("ppe"),
      intentId: consensus.intentId,
      lockId: consensus.lockId,
      eventType: "execution_blocked",
      eventPayload: { error },
    })

    return { decision: "blocked", intentLock: lock, consensusVerification: consensus, error }
  }

  const release: ExecutionRelease = {
    protocolVersion: "v1",
    intentId: consensus.intentId,
    lockId: consensus.lockId,
    releasedBy: input.requestedBy,
    releaseDecision: "approved",
    releaseReason: "All deterministic policy checks passed.",
    releasedAt: new Date().toISOString(),
  }

  await createPaymentProtocolEvent({
    id: makeProtocolId("ppe"),
    intentId: release.intentId,
    lockId: release.lockId,
    eventType: "execution_released",
    eventPayload: release,
  })

  return {
    decision: "approved",
    intentLock: lock,
    consensusVerification: consensus,
    release,
  }
}

export function enforceAdaptiveThrottle(identity: string, ceiling = 40, windowMs = 60_000) {
  const now = Date.now()
  const current = userThrottles.get(identity)

  if (!current || now - current.windowStart > windowMs) {
    userThrottles.set(identity, { count: 1, windowStart: now })
    return { allowed: true, remaining: ceiling - 1 }
  }

  current.count += 1

  if (current.count > ceiling) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: Math.max(ceiling - current.count, 0) }
}

export async function executeToolWithPolicy(
  tool: SupportedTool,
  payload: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const cacheKey = getToolCacheKey(tool, payload)
  const now = Date.now()
  const correlationId = context.correlationId ?? `${context.sessionId}:${context.messageId}`

  logApiEvent("info", "relay.tool.execution.started", {
    route: "relay/tool",
    requestId: correlationId,
    details: { tool, sessionId: context.sessionId, messageId: context.messageId, tenantId: context.tenantId, correlationId },
  })

  if (tool === "catalog_lookup") {
    const cached = catalogCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      logApiEvent("info", "relay.tool.execution.cache_hit", {
        route: "relay/tool",
        requestId: correlationId,
        details: { tool, correlationId },
      })
      return { tool, result: cached.value, fromCache: true }
    }
  }

  const lineage = await createToolCallLineage({
    session_id: context.sessionId,
    message_id: context.messageId,
    tool_name: tool,
    input: sanitizeToolPayloadForLineage(tool, payload),
    status: "started",
  })

  const execMap: Record<SupportedTool, () => Promise<Record<string, unknown>>> = {
    catalog_lookup: () => executeCatalogLookup(payload),
    inventory_health: () => executeInventoryHealth(payload),
    checkout_preview: () => executeCheckoutPreview(payload),
    web_search: () => executeWebSearch(payload),
    initiate_link_checkout: () => executeInitiateLinkCheckout(payload),
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= TOOL_RETRY_COUNT; attempt += 1) {
    try {
      const result = await runWithTimeout(execMap[tool](), TOOL_TIMEOUT_MS)
      await createToolResult(lineage.id, result)
      await completeToolCallLineage(lineage.id, "completed")

      if (tool === "catalog_lookup") {
        catalogCache.set(cacheKey, { value: result, expiresAt: Date.now() + 30_000 })
      }

      logApiEvent("info", "relay.tool.execution.completed", {
        route: "relay/tool",
        requestId: correlationId,
        details: { tool, correlationId, attempt },
      })
      return { tool, result, fromCache: false }
    } catch (error) {
      lastError = error
      if (attempt < TOOL_RETRY_COUNT) {
        logApiEvent("warn", "relay.tool.execution.retry", {
          route: "relay/tool",
          requestId: correlationId,
          details: { tool, correlationId, attempt },
        })
        await wait(120 * (attempt + 1))
      }
    }
  }

  await completeToolCallLineage(lineage.id, "failed")
  logApiEvent("error", "relay.tool.execution.failed", {
    route: "relay/tool",
    requestId: correlationId,
    error: lastError,
    details: { tool, correlationId },
  })
  throw lastError instanceof Error ? lastError : new Error("tool_execution_failed")
}

export const AgentOrchestrationService = {
  sanitizeUserInput,
  hasPromptInjection,
  isHighRiskAction,
  orchestrateProtocolRelease,
  executeToolWithPolicy,
  enforceAdaptiveThrottle,
  runRetentionSweep: pruneExpiredAgentRecords,
}
