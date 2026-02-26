type WalletCard = {
  id: string
  userId: string
  holderName: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  billingAddress?: string
  isDefault: boolean
  createdAt: string
}

type WalletActivity = {
  id: string
  userId: string
  type: "card_added" | "checkout" | "otp_verified" | "subscription_updated"
  description: string
  amount?: number
  currency?: string
  createdAt: string
}

type WalletSubscription = {
  id: string
  userId: string
  plan: string
  status: "active" | "paused" | "canceled"
  nextBillingDate: string
  amount: number
  currency: string
}

type LinkSession = {
  id: string
  email: string
  userId: string
  verificationCode: string
  verified: boolean
  createdAt: string
}

const cardsByUser = new Map<string, WalletCard[]>()
const activityByUser = new Map<string, WalletActivity[]>()
const subscriptionsByUser = new Map<string, WalletSubscription[]>()
const linkSessions = new Map<string, LinkSession>()

const seededUser = "demo-user"
if (!cardsByUser.has(seededUser)) {
  cardsByUser.set(seededUser, [
    {
      id: "card_demo_1",
      userId: seededUser,
      holderName: "RunAsh User",
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2028,
      billingAddress: "Bokaro, Jharkhand, India",
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  ])
  subscriptionsByUser.set(seededUser, [
    {
      id: "sub_demo_1",
      userId: seededUser,
      plan: "RunAsh Pro",
      status: "active",
      nextBillingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 29,
      currency: "USD",
    },
  ])
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getUserCards(userId: string) {
  return cardsByUser.get(userId) || []
}

function addActivity(userId: string, activity: Omit<WalletActivity, "id" | "userId" | "createdAt">) {
  const next: WalletActivity = { id: id("act"), userId, createdAt: new Date().toISOString(), ...activity }
  const existing = activityByUser.get(userId) || []
  activityByUser.set(userId, [next, ...existing])
  return next
}

function resolveUser(userId?: string | null) {
  return userId && userId.trim() ? userId : seededUser
}

export const WalletStore = {
  resolveUser,
  listCards(userId?: string | null) {
    return getUserCards(resolveUser(userId))
  },
  addCard(input: {
    userId?: string | null
    holderName: string
    cardNumber: string
    expMonth: number
    expYear: number
    brand?: string
    billingAddress?: string
    setDefault?: boolean
  }) {
    const userId = resolveUser(input.userId)
    const existing = getUserCards(userId)
    const last4 = input.cardNumber.replace(/\D/g, "").slice(-4)
    const created: WalletCard = {
      id: id("card"),
      userId,
      holderName: input.holderName,
      brand: input.brand || "card",
      last4,
      expMonth: input.expMonth,
      expYear: input.expYear,
      billingAddress: input.billingAddress,
      isDefault: Boolean(input.setDefault) || existing.length === 0,
      createdAt: new Date().toISOString(),
    }

    const next = (Boolean(input.setDefault) ? existing.map((card) => ({ ...card, isDefault: false })) : existing).concat(created)
    cardsByUser.set(userId, next)
    addActivity(userId, { type: "card_added", description: `Card •••• ${last4} saved for Link checkout` })
    return created
  },
  setDefaultCard(userId: string, cardId: string) {
    const cards = getUserCards(resolveUser(userId))
    const next = cards.map((card) => ({ ...card, isDefault: card.id === cardId }))
    cardsByUser.set(resolveUser(userId), next)
    return next.find((card) => card.id === cardId) || null
  },
  removeCard(userId: string, cardId: string) {
    const owner = resolveUser(userId)
    const cards = getUserCards(owner)
    const target = cards.find((c) => c.id === cardId)
    const next = cards.filter((card) => card.id !== cardId)
    if (next.length > 0 && !next.some((card) => card.isDefault)) {
      next[0] = { ...next[0], isDefault: true }
    }
    cardsByUser.set(owner, next)
    if (target) {
      addActivity(owner, { type: "card_added", description: `Card •••• ${target.last4} removed from wallet` })
    }
    return target
  },
  listActivity(userId?: string | null) {
    return activityByUser.get(resolveUser(userId)) || []
  },
  listSubscriptions(userId?: string | null) {
    return subscriptionsByUser.get(resolveUser(userId)) || []
  },
  updateSubscription(userId: string, subscriptionId: string, status: WalletSubscription["status"]) {
    const owner = resolveUser(userId)
    const subs = subscriptionsByUser.get(owner) || []
    const next = subs.map((sub) => (sub.id === subscriptionId ? { ...sub, status } : sub))
    subscriptionsByUser.set(owner, next)
    const updated = next.find((sub) => sub.id === subscriptionId) || null
    if (updated) {
      addActivity(owner, {
        type: "subscription_updated",
        description: `Subscription ${updated.plan} changed to ${status}`,
      })
    }
    return updated
  },
  createLinkSession(input: { userId?: string | null; email: string }) {
    const userId = resolveUser(input.userId)
    const code = `${Math.floor(100000 + Math.random() * 900000)}`
    const session: LinkSession = {
      id: id("link_session"),
      email: input.email,
      userId,
      verificationCode: code,
      verified: false,
      createdAt: new Date().toISOString(),
    }
    linkSessions.set(session.id, session)
    return { ...session, verificationCode: undefined as unknown as string, maskedPhone: "*** *** 3421" }
  },
  verifyLinkSession(sessionId: string, code: string) {
    const session = linkSessions.get(sessionId)
    if (!session) return { ok: false as const, message: "Session not found" }
    if (session.verificationCode !== code) return { ok: false as const, message: "Invalid verification code" }
    session.verified = true
    linkSessions.set(session.id, session)
    const cards = getUserCards(session.userId)
    const defaultCard = cards.find((card) => card.isDefault) || cards[0] || null
    addActivity(session.userId, { type: "otp_verified", description: `Link account verification completed for ${session.email}` })
    return {
      ok: true as const,
      defaultCard,
      autofill: defaultCard
        ? {
            email: session.email,
            paymentMethod: `${defaultCard.brand.toUpperCase()} •••• ${defaultCard.last4}`,
            billingAddress: defaultCard.billingAddress || "Saved billing address",
          }
        : null,
    }
  },
  logCheckout(input: { userId?: string | null; amount: number; currency: string; description: string }) {
    const owner = resolveUser(input.userId)
    addActivity(owner, {
      type: "checkout",
      description: input.description,
      amount: input.amount,
      currency: input.currency,
    })
  },
}
