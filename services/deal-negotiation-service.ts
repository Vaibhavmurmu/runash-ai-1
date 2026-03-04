import { createHash, randomUUID } from "crypto"

import { createBrokerMatch } from "@/lib/repositories/broker-matches"
import { createDealEvent } from "@/lib/repositories/deal-events"
import { createDeal, getDealById, updateDealResolution, type DealRecord } from "@/lib/repositories/deals"
import { resolveDiscountPolicy } from "@/lib/repositories/discount-policies"
import { createOffer, updateOfferStatus } from "@/lib/repositories/offers"

export type NegotiationActorRole = "buyer" | "seller" | "broker"

export type DealSnapshot = {
  deal_id: string
  sku: string
  quantity: number
  currency: string
  final_price_minor: number
  discount_basis: string
  accepted_offer_id: string
}

function deterministicDealId(input: {
  tenantId: string
  buyerId: string
  sellerId: string
  sku: string
  quantity: number
  listPriceMinor: number
}) {
  const material = [
    input.tenantId.trim().toLowerCase(),
    input.buyerId.trim().toLowerCase(),
    input.sellerId.trim().toLowerCase(),
    input.sku.trim().toUpperCase(),
    String(Math.max(1, Math.round(input.quantity))),
    String(Math.max(0, Math.round(input.listPriceMinor))),
  ].join("|")

  return `deal_${createHash("sha256").update(material).digest("hex").slice(0, 24)}`
}

function asPercent(baseMinor: number, amountMinor: number) {
  if (!Number.isFinite(baseMinor) || baseMinor <= 0) return 0
  return Math.max(0, ((baseMinor - amountMinor) / baseMinor) * 100)
}

function resolveExpirationIso(expirationSeconds?: number) {
  if (!expirationSeconds || !Number.isFinite(expirationSeconds) || expirationSeconds <= 0) return null
  return new Date(Date.now() + Math.round(expirationSeconds * 1000)).toISOString()
}

async function buildAcceptedSnapshot(deal: DealRecord, acceptedOfferId: string, finalPriceMinor: number, discountBasis: string) {
  const snapshot: DealSnapshot = {
    deal_id: deal.id,
    sku: deal.sku,
    quantity: deal.quantity,
    currency: deal.currency,
    final_price_minor: finalPriceMinor,
    discount_basis: discountBasis,
    accepted_offer_id: acceptedOfferId,
  }

  await updateDealResolution({
    dealId: deal.id,
    state: "accepted",
    finalPriceMinor,
    acceptedOfferId,
    discountBasis,
    acceptedSnapshot: snapshot,
  })

  return snapshot
}

export async function createInitialQuote(input: {
  tenantId: string
  buyerId: string
  sellerId: string
  brokerId?: string
  sku: string
  quantity: number
  listPriceMinor: number
  currency?: string
  quoteAmountMinor: number
  actorRole?: NegotiationActorRole
  expirationSeconds?: number
}) {
  const dealId = deterministicDealId(input)
  const expiresAt = resolveExpirationIso(input.expirationSeconds)
  const existing = await getDealById(dealId)

  const deal = existing
    ? existing
    : await createDeal({
      id: dealId,
      tenantId: input.tenantId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      brokerId: input.brokerId,
      sku: input.sku,
      quantity: input.quantity,
      currency: input.currency,
      listPriceMinor: input.listPriceMinor,
      expiresAt,
    })

  const actorRole = input.actorRole ?? "seller"
  const discountPercent = asPercent(deal.listPriceMinor, input.quoteAmountMinor)

  const offer = await createOffer({
    id: `offer_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    actorRole,
    actorId: actorRole === "buyer" ? deal.buyerId : actorRole === "seller" ? deal.sellerId : deal.brokerId ?? deal.sellerId,
    amountMinor: input.quoteAmountMinor,
    discountPercent,
    expiresAt,
  })

  await createDealEvent({
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    eventType: "initial_quote_created",
    actorRole,
    actorId: offer.actorId,
    eventPayload: { offer_id: offer.id, amount_minor: offer.amountMinor, expires_at: expiresAt },
  })

  return { deal_id: deal.id, offer_id: offer.id, state: deal.state, discount_percent: discountPercent, expires_at: expiresAt }
}

export async function counterOffer(input: {
  dealId: string
  actorRole: NegotiationActorRole
  actorId: string
  amountMinor: number
  expirationSeconds?: number
}) {
  const deal = await getDealById(input.dealId)
  if (!deal) throw new Error("Deal not found")

  const expiresAt = resolveExpirationIso(input.expirationSeconds)
  const discountPercent = asPercent(deal.listPriceMinor, input.amountMinor)
  const policy = await resolveDiscountPolicy(deal.tenantId, deal.sku)

  let status: "accepted" | "rejected" | "pending" = "pending"
  let reason = "pending_manual_review"

  if (policy) {
    if (discountPercent <= policy.autoAcceptThresholdPercent) {
      status = "accepted"
      reason = "auto_accept_threshold"
    } else if (discountPercent >= policy.autoRejectThresholdPercent) {
      status = "rejected"
      reason = "auto_reject_threshold"
    }
  }

  const offer = await createOffer({
    id: `offer_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    actorRole: input.actorRole,
    actorId: input.actorId,
    amountMinor: input.amountMinor,
    discountPercent,
    status,
    expiresAt,
    metadata: { decision_reason: reason },
  })

  await createDealEvent({
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    eventType: "counter_offer_submitted",
    actorRole: input.actorRole,
    actorId: input.actorId,
    eventPayload: {
      offer_id: offer.id,
      amount_minor: offer.amountMinor,
      discount_percent: offer.discountPercent,
      decision: status,
      decision_reason: reason,
      expires_at: expiresAt,
    },
  })

  if (status === "accepted") {
    const snapshot = await buildAcceptedSnapshot(deal, offer.id, offer.amountMinor, "policy_threshold")
    return { deal_id: deal.id, offer_id: offer.id, decision: status, reason, snapshot }
  }

  if (status === "rejected") {
    await updateOfferStatus({ offerId: offer.id, status: "rejected" })
    await updateDealResolution({ dealId: deal.id, state: "rejected", discountBasis: "policy_threshold" })
  }

  return { deal_id: deal.id, offer_id: offer.id, decision: status, reason }
}

export async function brokerMediatedSettlement(input: {
  dealId: string
  brokerId: string
  settlementAmountMinor: number
  settlementReason?: string
}) {
  const deal = await getDealById(input.dealId)
  if (!deal) throw new Error("Deal not found")

  const policy = await resolveDiscountPolicy(deal.tenantId, deal.sku)
  const settlementDiscountPercent = asPercent(deal.listPriceMinor, input.settlementAmountMinor)

  if (
    policy
    && (settlementDiscountPercent < policy.settlementFloorPercent || settlementDiscountPercent > policy.settlementCeilingPercent)
  ) {
    throw new Error("Settlement outside configured policy band")
  }

  const brokerMatch = await createBrokerMatch({
    id: `bm_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    brokerId: input.brokerId,
    settlementAmountMinor: input.settlementAmountMinor,
    settlementReason: input.settlementReason ?? "broker_mediated",
    status: "accepted",
    metadata: { settlement_discount_percent: settlementDiscountPercent },
  })

  const offer = await createOffer({
    id: `offer_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    actorRole: "broker",
    actorId: input.brokerId,
    amountMinor: input.settlementAmountMinor,
    discountPercent: settlementDiscountPercent,
    status: "accepted",
    metadata: { broker_match_id: brokerMatch.id },
  })

  const snapshot = await buildAcceptedSnapshot(deal, offer.id, offer.amountMinor, "broker_settlement")

  await createDealEvent({
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    dealId: deal.id,
    eventType: "broker_settlement_accepted",
    actorRole: "broker",
    actorId: input.brokerId,
    eventPayload: {
      broker_match_id: brokerMatch.id,
      settlement_amount_minor: input.settlementAmountMinor,
      settlement_reason: input.settlementReason ?? "broker_mediated",
    },
  })

  return { deal_id: deal.id, broker_match_id: brokerMatch.id, snapshot }
}

export async function getAcceptedDealSnapshot(dealId: string): Promise<DealSnapshot | null> {
  const deal = await getDealById(dealId)
  if (!deal || deal.state !== "accepted" || !deal.acceptedSnapshot) return null

  return deal.acceptedSnapshot as DealSnapshot
}
