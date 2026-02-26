import {
  createWalletLinkSessionWithProvider,
  getWalletLinkSessionById,
  createWalletCard,
  createWalletLinkSession,
  listWalletActivity,
  listWalletCards,
  listWalletSubscriptions,
  logWalletCheckout,
  removeWalletCard,
  setWalletDefaultCard,
  updateWalletSubscriptionStatus,
  updateWalletLinkSessionProviderStatus,
  verifyWalletLinkSession,
} from "@/lib/repositories/wallet"

const seededUser = "demo-user"

function resolveUser(userId?: string | null) {
  return userId && userId.trim() ? userId : seededUser
}

export const WalletStore = {
  resolveUser,
  async listCards(userId?: string | null) {
    return listWalletCards(resolveUser(userId))
  },
  async addCard(input: {
    userId?: string | null
    holderName: string
    cardNumber: string
    expMonth: number
    expYear: number
    brand?: string
    billingAddress?: string
    setDefault?: boolean
  }) {
    return createWalletCard({ ...input, userId: resolveUser(input.userId) })
  },
  async setDefaultCard(userId: string, cardId: string) {
    return setWalletDefaultCard(resolveUser(userId), cardId)
  },
  async removeCard(userId: string, cardId: string) {
    return removeWalletCard(resolveUser(userId), cardId)
  },
  async listActivity(userId?: string | null) {
    return listWalletActivity(resolveUser(userId))
  },
  async listSubscriptions(userId?: string | null) {
    return listWalletSubscriptions(resolveUser(userId))
  },
  async updateSubscription(userId: string, subscriptionId: string, status: "active" | "paused" | "canceled") {
    return updateWalletSubscriptionStatus(resolveUser(userId), subscriptionId, status)
  },
  async createLinkSession(input: { userId?: string | null; email: string }) {
    return createWalletLinkSession({ userId: resolveUser(input.userId), email: input.email })
  },
  async createLinkSessionWithProvider(input: {
    userId?: string | null
    email: string
    provider: "stripe_link"
    providerSessionId: string
    providerCustomerId?: string | null
    providerRequestId?: string | null
    maskedPhone: string
  }) {
    return createWalletLinkSessionWithProvider({
      userId: resolveUser(input.userId),
      email: input.email,
      provider: input.provider,
      providerSessionId: input.providerSessionId,
      providerCustomerId: input.providerCustomerId,
      providerRequestId: input.providerRequestId,
      maskedPhone: input.maskedPhone,
    })
  },
  async getLinkSessionById(sessionId: string) {
    return getWalletLinkSessionById(sessionId)
  },
  async updateLinkSessionProviderStatus(input: {
    sessionId?: string
    providerSessionId?: string
    status: "pending" | "verified" | "failed" | "expired"
    reason?: string | null
    providerRequestId?: string | null
  }) {
    return updateWalletLinkSessionProviderStatus(input)
  },
  async getLinkAutofillForSession(sessionId: string) {
    const session = await getWalletLinkSessionById(sessionId)
    if (!session) {
      return { defaultCard: null, autofill: null }
    }

    const cards = await listWalletCards(session.userId)
    const defaultCard = cards.find((card) => card.isDefault) || cards[0] || null

    return {
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
  async verifyLinkSession(sessionId: string, code: string) {
    return verifyWalletLinkSession(sessionId, code)
  },
  async logCheckout(input: { userId?: string | null; amount: number; currency: string; description: string }) {
    return logWalletCheckout({ ...input, userId: resolveUser(input.userId) })
  },
}
