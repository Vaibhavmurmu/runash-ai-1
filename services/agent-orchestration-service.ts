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
import {
  executeRoleConditionedTool,
  type RelayAgentTool,
} from "@/lib/skills/relay-tool-registry"
import { logApiEvent } from "@/lib/api/logging"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import { enforcePaymentValidatorMiddleware } from "@/lib/payments/validator-gate"
import { searchProductsWithProviders } from "@/services/web-search-service"
import { postAccountingEvent, type AccountingEventType } from "@/lib/services/runashbook-accounting-service"
import { getAcceptedDealSnapshot } from "@/services/deal-negotiation-service"
import { createAgentRoleDecision } from "@/lib/repositories/agent-role-decisions"
import {
  clampRolePreferences,
  resolveRolePolicy,
  type AgentRole,
  type RolePreferences,
} from "@/services/agent-role-orchestration"

export type SupportedTool = RelayAgentTool

export type ToolExecutionContext = {
  sessionId: string
  messageId: string
  tenantId: string
  role?: AgentRole
  preferences?: RolePreferences
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




type AccountingSyncResult = {
  status: "posted" | "duplicate" | "pending_sync" | "skipped"
  eventType?: AccountingEventType
  idempotencyKey?: string
  correlationKey?: string
  pendingReason?: string
}

export function shouldPostAccountingEvent(checkoutStatus: unknown, paymentStatus: unknown) {
  const status = String(checkoutStatus ?? "").toLowerCase()
  const normalizedPaymentStatus = String(paymentStatus ?? "payment_succeeded").toLowerCase()
  const postableStatuses = new Set(["initiated", "succeeded", "confirmed", "payment_succeeded", "refund"])
  const postablePaymentStatuses = new Set(["payment_succeeded", "refund"])

  return postableStatuses.has(status) && postablePaymentStatuses.has(normalizedPaymentStatus)
}

export function mapAccountingEventType(paymentStatus: unknown): AccountingEventType {
  const normalized = String(paymentStatus ?? "payment_succeeded").toLowerCase()
  return normalized === "refund" ? "refund" : "payment_succeeded"
}

export async function syncCheckoutResultToAccounting(input: {
  payload: Record<string, unknown>
  result: Record<string, unknown>
  correlationId: string
  postAccountingEventFn?: typeof postAccountingEvent
}) {
  const payload = input.payload
  const result = input.result
  const postAccountingEventFn = input.postAccountingEventFn ?? postAccountingEvent
  const accountingContext = payload.accounting_context && typeof payload.accounting_context === "object"
    ? (payload.accounting_context as Record<string, unknown>)
    : {}

  const paymentStatus = payload.payment_status ?? result.payment_status ?? "payment_succeeded"
  if (!shouldPostAccountingEvent(result.status, paymentStatus)) {
    return { status: "skipped" } satisfies AccountingSyncResult
  }

  const eventType = mapAccountingEventType(paymentStatus)
  const merchantId = String(payload.merchant_id ?? "runash-default-merchant")
  const merchantEntityId = String(payload.merchant_entity_id ?? `${merchantId}-entity`)
  const merchantCountry = String(payload.merchant_country ?? accountingContext.jurisdiction ?? "US").toUpperCase()
  const amountMinor = Number(payload.amount)
  const amount = Number.isFinite(amountMinor) ? Math.round(amountMinor) / 100 : 0
  const taxBreakdown = accountingContext.tax_breakdown && typeof accountingContext.tax_breakdown === "object"
    ? (accountingContext.tax_breakdown as Record<string, unknown>)
    : {}
  const feeBreakdown = accountingContext.fee_breakdown && typeof accountingContext.fee_breakdown === "object"
    ? (accountingContext.fee_breakdown as Record<string, unknown>)
    : {}

  const correlationKey = String(accountingContext.correlation_key ?? payload.correlation_key ?? input.correlationId)
  const upstreamIdempotencyKey = String(
    payload.idempotency_key ?? result.idempotency_key ?? accountingContext.idempotency_key ?? `intent:${createHash("sha256").update(correlationKey).digest("hex")}`,
  )
  const accountingIdempotencyKey = `${upstreamIdempotencyKey}:accounting:${eventType}`

  try {
    const post = await postAccountingEventFn({
      event: {
        eventType,
        occurredAt: String(payload.event_timestamp ?? new Date().toISOString()),
        amount,
        currency: String(payload.currency ?? "USD").toUpperCase(),
        taxAmount: Number(taxBreakdown.amount ?? 0),
        feeAmount: Number(feeBreakdown.amount ?? 0),
        merchantCountry,
        merchantEntityId,
        merchantId,
        correlationKey,
        idempotencyKey: accountingIdempotencyKey,
        provider: "relay",
        providerReference: String(result.checkout_session_id ?? result.request_id ?? correlationKey),
        metadata: {
          payment_status: paymentStatus,
          jurisdiction: accountingContext.jurisdiction ?? merchantCountry,
          tax_breakdown: taxBreakdown,
          fee_breakdown: feeBreakdown,
          product_plan_metadata: accountingContext.product_plan_metadata ?? payload.product_metadata,
          checkout_request_id: result.request_id,
        },
      },
    })

    return {
      status: post.duplicate ? "duplicate" : "posted",
      eventType,
      idempotencyKey: accountingIdempotencyKey,
      correlationKey,
    } satisfies AccountingSyncResult
  } catch (error) {
    logApiEvent("warn", "relay.checkout.accounting_sync_pending", {
      route: "relay/tool",
      requestId: input.correlationId,
      details: {
        eventType,
        merchantId,
        correlationKey,
        idempotencyKey: accountingIdempotencyKey,
        pendingSync: true,
        reconciliationSignal: "ops.accounting.reconcile_required",
      },
      error,
    })

    return {
      status: "pending_sync",
      eventType,
      idempotencyKey: accountingIdempotencyKey,
      correlationKey,
      pendingReason: "accounting_sync_failed",
    } satisfies AccountingSyncResult
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
  const dealId = typeof payload.deal_id === "string" ? payload.deal_id : null
  const acceptedDealSnapshot = dealId ? await getAcceptedDealSnapshot(dealId) : null
  const handoffPayload = acceptedDealSnapshot
    ? {
      ...payload,
      amount: acceptedDealSnapshot.final_price_minor,
      currency: acceptedDealSnapshot.currency,
      line_items: [
        {
          sku: acceptedDealSnapshot.sku,
          quantity: acceptedDealSnapshot.quantity,
          unit_amount: acceptedDealSnapshot.final_price_minor,
        },
      ],
      discount_basis: acceptedDealSnapshot.discount_basis,
      accepted_deal_snapshot: acceptedDealSnapshot,
    }
    : payload

  const amount = Number(handoffPayload.amount)
  const currency = String(handoffPayload.currency ?? "USD")
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

  const result = (await relayAgentSkillModules.initiate_link_checkout.execute(handoffPayload)) as Record<string, unknown>
  const accountingSync = await syncCheckoutResultToAccounting({
    payload: handoffPayload,
    result,
    correlationId: String(payload.idempotency_key ?? payload.correlation_key ?? randomUUID()),
  })

  return {
    ...result,
    deal_id: dealId ?? undefined,
    accepted_deal_snapshot: acceptedDealSnapshot ?? undefined,
    validatorGate,
    accounting_sync: accountingSync,
    pending_sync: accountingSync.status === "pending_sync",
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

  const role = context.role ?? "broker"
  const preferences = clampRolePreferences(context.preferences)
  const policy = resolveRolePolicy(role)
  const execMap: Record<SupportedTool, () => Promise<Record<string, unknown>>> = {
    catalog_lookup: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "catalog_lookup", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
    inventory_health: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "inventory_health", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
    checkout_preview: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "checkout_preview", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
    web_search: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "web_search", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
    initiate_link_checkout: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "initiate_link_checkout", args: payload })
      if (execution.activitySummary.status === "blocked") {
        return { ...execution.result, activity_summary_role: execution.activitySummary }
      }

      const checkoutResult = await executeInitiateLinkCheckout(payload)
      return { ...checkoutResult, activity_summary_role: execution.activitySummary }
    },
    create_initial_quote: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "create_initial_quote", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
    submit_counter_offer: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "submit_counter_offer", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
    broker_settle_deal: async () => {
      const execution = await executeRoleConditionedTool({ role, tool: "broker_settle_deal", args: payload })
      return { ...execution.result, activity_summary_role: execution.activitySummary }
    },
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= TOOL_RETRY_COUNT; attempt += 1) {
    try {
      const result = await runWithTimeout(execMap[tool](), TOOL_TIMEOUT_MS)
      await createToolResult(lineage.id, result)
      await completeToolCallLineage(lineage.id, "completed")
      const roleActivity =
        result.activity_summary_role && typeof result.activity_summary_role === "object"
          ? (result.activity_summary_role as Record<string, unknown>)
          : undefined
      await createAgentRoleDecision({
        sessionId: context.sessionId,
        messageId: context.messageId,
        tenantId: context.tenantId,
        agentRole: role,
        toolName: tool,
        decisionStatus: roleActivity?.status === "blocked" ? "blocked" : "completed",
        objectiveWeights: policy.objectiveWeights,
        guardrails: policy.guardrails,
        preferences,
        outcome: result,
      })

      if (tool === "catalog_lookup") {
        catalogCache.set(cacheKey, { value: result, expiresAt: Date.now() + 30_000 })
      }

      logApiEvent("info", "relay.tool.execution.completed", {
        route: "relay/tool",
        requestId: correlationId,
        details: { tool, correlationId, attempt, role },
      })
      return { tool, result, fromCache: false }
    } catch (error) {
      lastError = error
      if (attempt < TOOL_RETRY_COUNT) {
        logApiEvent("warn", "relay.tool.execution.retry", {
          route: "relay/tool",
          requestId: correlationId,
          details: { tool, correlationId, attempt, role },
        })
        await wait(120 * (attempt + 1))
      }
    }
  }

  await completeToolCallLineage(lineage.id, "failed")
  await createAgentRoleDecision({
    sessionId: context.sessionId,
    messageId: context.messageId,
    tenantId: context.tenantId,
    agentRole: role,
    toolName: tool,
    decisionStatus: "failed",
    objectiveWeights: policy.objectiveWeights,
    guardrails: policy.guardrails,
    preferences,
    outcome: { error: lastError instanceof Error ? lastError.message : "tool_execution_failed" },
  })
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
